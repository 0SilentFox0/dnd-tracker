// @vitest-environment happy-dom
import { useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type MediaSyncInput, useAudioElementSync } from "../useAudioElementSync";

import type { BattleAudioState } from "@/types/audio";

let api: ReturnType<typeof useAudioElementSync>;

function Harness(input: MediaSyncInput) {
  const sync = useAudioElementSync(input);

  const { ref } = sync;

  useEffect(() => {
    api = sync;
  });

  return <audio ref={ref} data-testid="audio" />;
}

const state = (over: Partial<BattleAudioState> = {}): BattleAudioState => ({ trackId: "t", track: { title: "Бій", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 }, playing: true, offsetSec: 0, startedAt: 0, seq: 1, ...over });

const base: MediaSyncInput = { src: "https://s/1.mp3", state: state(), clockOffsetMs: 0, active: true, volume: 0.5, muted: false };

function media(el: HTMLAudioElement, m: { currentTime?: number; paused?: boolean; duration?: number }) {
  let current = m.currentTime ?? 0;

  Object.defineProperty(el, "currentTime", { configurable: true, get: () => current, set: (v: number) => (current = v) });
  Object.defineProperty(el, "paused", { configurable: true, get: () => m.paused ?? true });
  Object.defineProperty(el, "duration", { configurable: true, get: () => m.duration ?? NaN });
  Object.defineProperty(el, "readyState", { configurable: true, get: () => 4 });
}

beforeEach(() => {
  vi.useFakeTimers({ now: 30_000, toFake: ["Date", "setInterval", "clearInterval"] });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAudioElementSync", () => {
  it("до розблокування — без src (egress) і без play", () => {
    const { getByTestId } = render(<Harness {...base} active={false} />);

    expect(getByTestId("audio").getAttribute("src")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("prime у жесті ставить src і викликає play на тому самому елементі", () => {
    const { getByTestId } = render(<Harness {...base} active={false} />);

    act(() => api.prime());

    expect(getByTestId("audio").getAttribute("src")).toBe("https://s/1.mp3");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("активний: гучність і mute з налаштувань; перемотка лише при дрейфі > 1,5 с", () => {
    const { getByTestId, rerender } = render(<Harness {...base} />);

    const el = getByTestId("audio") as HTMLAudioElement;

    expect(el.volume).toBe(0.5);

    media(el, { currentTime: 29, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ seq: 2 })} />);
    expect(el.currentTime).toBe(29);

    media(el, { currentTime: 10, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ seq: 3 })} muted />);
    expect(el.currentTime).toBe(30);
    expect(el.muted).toBe(true);
  });

  it("пауза ДМ — pause; перевірка дрейфу кожні 10 с", () => {
    const { getByTestId, rerender } = render(<Harness {...base} />);

    const el = getByTestId("audio") as HTMLAudioElement;

    media(el, { currentTime: 30, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ playing: false, offsetSec: 30, seq: 2 })} />);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    media(el, { currentTime: 30, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ seq: 3 })} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(el.currentTime).toBe(40);
  });

  it("помилка файлу — failed; зміна src (інший трек, YouTube, «Стоп») скидає failed", () => {
    const { getByTestId, rerender } = render(<Harness {...base} />);

    act(() => {
      getByTestId("audio").dispatchEvent(new Event("error"));
    });
    expect(api.failed).toBe(true);

    rerender(<Harness {...base} src={null} />);
    expect(api.failed).toBe(false);
  });
});
