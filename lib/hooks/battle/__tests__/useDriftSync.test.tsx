// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type DriftSyncInput, type MediaHandle, useDriftSync } from "../useDriftSync";

import { audioState } from "@/lib/utils/audio/__tests__/fixtures";

const state = audioState;

function fakeMedia(over: Partial<MediaHandle> = {}): MediaHandle {
  return { ready: () => true, currentTime: () => 0, paused: () => true, duration: () => null, play: vi.fn(), pause: vi.fn(), seek: vi.fn(), ...over };
}

beforeEach(() => vi.useFakeTimers({ now: 130_000, toFake: ["Date", "setInterval", "clearInterval"] }));

afterEach(() => vi.useRealTimers());

describe("useDriftSync", () => {
  it("тривалість плеєра невідома — петля за тривалістю треку зі стану", () => {
    const media = fakeMedia();

    renderHook(() => useDriftSync(media, { state: state(), clockOffsetMs: 0, canPlay: true }));

    expect(media.seek).toHaveBeenCalledWith(30);
    expect(media.play).toHaveBeenCalled();
  });

  it("canPlay = false — не грає; відмова play() іде в onPlayRejected", async () => {
    const blocked = new Error("blocked");

    const media = fakeMedia({ play: vi.fn(() => Promise.reject(blocked)) });

    const onPlayRejected = vi.fn();

    const { rerender } = renderHook((input: DriftSyncInput) => useDriftSync(media, input), { initialProps: { state: state(), clockOffsetMs: 0, canPlay: false, onPlayRejected } as DriftSyncInput });

    expect(media.play).not.toHaveBeenCalled();

    rerender({ state: state(), clockOffsetMs: 0, canPlay: true, resyncKey: 1, onPlayRejected });
    await act(async () => undefined);

    expect(onPlayRejected).toHaveBeenCalledWith(blocked);
  });

  it("без плеєра — нічого; з плеєром — перевірка дрейфу кожні 10 с", () => {
    const media = fakeMedia({ paused: () => false, currentTime: () => 30 });

    const { rerender } = renderHook(({ m }: { m: MediaHandle | null }) => useDriftSync(m, { state: state(), clockOffsetMs: 0, canPlay: true }), { initialProps: { m: null as MediaHandle | null } });

    rerender({ m: media });
    expect(media.seek).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(10_000));
    expect(media.seek).toHaveBeenCalledWith(40);
  });
});
