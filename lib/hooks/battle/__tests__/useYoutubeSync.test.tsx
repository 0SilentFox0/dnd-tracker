// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useYoutubeSync } from "../useYoutubeSync";

import { audioState, youtubeTrack } from "@/lib/utils/audio/__tests__/fixtures";

const created = vi.hoisted(() => [] as Array<{ options: Record<string, unknown>; player: Record<string, ReturnType<typeof vi.fn>> }>);

const duration = vi.hoisted(() => ({ sec: 200 }));

vi.mock("@/lib/utils/audio/youtube-iframe-api", () => ({
  YT_STATE: { PLAYING: 1, PAUSED: 2 },
  loadYoutubeIframeApi: vi.fn(async () => ({
    Player: class {
      constructor(_el: HTMLElement, options: { events: { onReady(): void; onStateChange(e: { data: number }): void } } & Record<string, unknown>) {
        const player = {
          playVideo: vi.fn(),
          pauseVideo: vi.fn(),
          seekTo: vi.fn(),
          getCurrentTime: vi.fn(() => 5),
          getDuration: vi.fn(() => duration.sec),
          getPlayerState: vi.fn(() => 2),
          setVolume: vi.fn(),
          mute: vi.fn(),
          unMute: vi.fn(),
          destroy: vi.fn(),
        };

        // як справжній YT: після destroy() iframe вже немає, будь-який виклик падає
        const live = Object.fromEntries(
          Object.entries(player).map(([k, fn]) => [k, (...a: unknown[]) => (k !== "destroy" && player.destroy.mock.calls.length ? (null as unknown as { src: string }).src : fn(...a))]),
        );

        created.push({ options, player });
        Object.assign(this, live);
        queueMicrotask(() => options.events.onReady());
      }
    },
  })),
}));

const state = audioState({ track: youtubeTrack });

function Harness({ videoId, audio = state, hostKey = "a" }: { videoId: string | null; audio?: typeof state; hostKey?: string }) {
  const { ref } = useYoutubeSync({ videoId, state: audio, clockOffsetMs: 0, volume: 0.4, muted: false });

  return <div key={hostKey} ref={ref} />;
}

beforeEach(() => {
  created.length = 0;
  duration.sec = 200;
  vi.useFakeTimers({ now: 60_000, toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useYoutubeSync", () => {
  it("nocookie-хост, видимий 200×200, петля через playlist, гучність, позиція з годинника", async () => {
    render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created).toHaveLength(1));

    const { options, player } = created[0];

    expect(options).toMatchObject({
      host: "https://www.youtube-nocookie.com",
      videoId: "dQw4w9WgXcQ",
      width: 200,
      height: 200,
      playerVars: expect.objectContaining({ loop: 1, playlist: "dQw4w9WgXcQ", playsinline: 1 }),
    });

    await waitFor(() => expect(player.seekTo).toHaveBeenCalledWith(60, true));
    expect(player.setVolume).toHaveBeenCalledWith(40);
    expect(player.playVideo).toHaveBeenCalled();
  });

  it("зміна відео або розмонтування — destroy", async () => {
    const { rerender, unmount } = render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created).toHaveLength(1));

    rerender(<Harness videoId={null} />);
    expect(created[0].player.destroy).toHaveBeenCalled();

    act(() => unmount());
  });

  it("перемикання на інший трек: знищений плеєр більше не викликається (YT кидав «reading 'src'»)", async () => {
    const { rerender } = render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created[0]?.player.playVideo).toHaveBeenCalled());

    const next = audioState({ trackId: "t3", track: { ...youtubeTrack, youtubeId: "aaaaaaaaaaa" }, seq: state.seq + 1 });

    expect(() => rerender(<Harness videoId="aaaaaaaaaaa" audio={next} />)).not.toThrow();
    await waitFor(() => expect(created).toHaveLength(2));
    await waitFor(() => expect(created[1].player.playVideo).toHaveBeenCalled());
  });

  it("новий контейнер того ж відео разом зі зміною стану («Очима гравця»): знищений плеєр не викликається", async () => {
    const { rerender } = render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created[0]?.player.playVideo).toHaveBeenCalled());

    const next = audioState({ track: youtubeTrack, seq: state.seq + 1, offsetSec: 30, startedAt: 50_000 });

    expect(() => rerender(<Harness videoId="dQw4w9WgXcQ" audio={next} hostKey="b" />)).not.toThrow();
    await waitFor(() => expect(created).toHaveLength(2));
    await waitFor(() => expect(created[1].player.playVideo).toHaveBeenCalled());
  });

  it("тривалість ще невідома (0) — грає, але не перемотує: ціль без петлі могла б вийти за кінець", async () => {
    duration.sec = 0;
    render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created[0]?.player.playVideo).toHaveBeenCalled());
    expect(created[0].player.seekTo).not.toHaveBeenCalled();
  });

  it("тривалість стала відома лише на PLAYING — перемотує одразу, не чекаючи перевірки дрейфу", async () => {
    duration.sec = 0;
    render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created[0]?.player.playVideo).toHaveBeenCalled());

    const { options, player } = created[0];

    duration.sec = 200;
    act(() => (options.events as { onStateChange(e: { data: number }): void }).onStateChange({ data: 1 }));

    expect(player.seekTo).toHaveBeenCalledWith(60, true);
  });
});
