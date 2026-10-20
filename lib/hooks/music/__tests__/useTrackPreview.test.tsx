// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTrackPreview } from "../useTrackPreview";

import type { CampaignTrack } from "@/types/audio";

const audios: FakeAudio[] = [];

class FakeAudio {
  src: string;
  duration = 100;
  currentTime = 25;
  pause = vi.fn();
  load = vi.fn();
  play = vi.fn(() => Promise.resolve());
  addEventListener = vi.fn();
  removeAttribute = vi.fn();

  constructor(src: string) {
    this.src = src;
    audios.push(this);
  }
}

const file = (id: string): CampaignTrack => ({ id, title: id, kind: "file", url: `https://s/${id}.mp3`, youtubeId: null, durationSec: 10, sortOrder: 0, createdAt: "" });

beforeEach(() => {
  audios.length = 0;
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useTrackPreview", () => {
  it("грає один трек: інший зупиняє попередній, повторний клік — стоп", () => {
    const { result } = renderHook(() => useTrackPreview());

    act(() => result.current.toggle(file("a")));
    expect(result.current.playingId).toBe("a");

    act(() => result.current.toggle(file("b")));
    expect(result.current.playingId).toBe("b");
    expect(audios[0].pause).toHaveBeenCalled();
    expect(audios).toHaveLength(2);

    act(() => result.current.toggle(file("b")));
    expect(result.current.playingId).toBeNull();
    expect(audios[1].pause).toHaveBeenCalled();
  });

  it("прогрес оновлюється за таймером", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useTrackPreview());

    act(() => result.current.toggle(file("a")));
    act(() => void vi.advanceTimersByTime(600));
    expect(result.current.progress).toBe(0.25);
  });

  it("зупиняє звук при розмонтуванні", () => {
    const { result, unmount } = renderHook(() => useTrackPreview());

    act(() => result.current.toggle(file("a")));
    unmount();
    expect(audios[0].pause).toHaveBeenCalled();
  });

  it("трек без джерела не стає активним", () => {
    const { result } = renderHook(() => useTrackPreview());

    act(() => result.current.toggle({ ...file("a"), url: null }));
    expect(result.current.playingId).toBeNull();
  });
});
