// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useYoutubeSync } from "../useYoutubeSync";

import type { BattleAudioState } from "@/types/audio";

const created = vi.hoisted(() => [] as Array<{ options: Record<string, unknown>; player: Record<string, ReturnType<typeof vi.fn>> }>);

const duration = vi.hoisted(() => ({ sec: 200 }));

vi.mock("@/lib/utils/audio/youtube-iframe-api", () => ({
  YT_STATE: { PLAYING: 1, PAUSED: 2 },
  loadYoutubeIframeApi: vi.fn(async () => ({
    Player: class {
      constructor(_el: HTMLElement, options: { events: { onReady(): void } } & Record<string, unknown>) {
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

        created.push({ options, player });
        Object.assign(this, player);
        queueMicrotask(() => options.events.onReady());
      }
    },
  })),
}));

const state: BattleAudioState = { trackId: "t", track: { title: "YT", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null }, playing: true, offsetSec: 0, startedAt: 0, seq: 1 };

function Harness({ videoId }: { videoId: string | null }) {
  const { ref } = useYoutubeSync({ videoId, state, clockOffsetMs: 0, volume: 0.4, muted: false });

  return <div ref={ref} />;
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

  it("тривалість ще невідома (0) — грає, але не перемотує: ціль без петлі могла б вийти за кінець", async () => {
    duration.sec = 0;
    render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created[0]?.player.playVideo).toHaveBeenCalled());
    expect(created[0].player.seekTo).not.toHaveBeenCalled();
  });
});
