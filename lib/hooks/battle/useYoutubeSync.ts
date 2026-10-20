"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { type MediaHandle, useDriftSync } from "./useDriftSync";

import { YOUTUBE_NOCOOKIE_HOST, YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { loadYoutubeIframeApi, YT_STATE, type YtPlayer } from "@/lib/utils/audio/youtube-iframe-api";
import type { BattleAudioState } from "@/types/audio";

const TAP_HINT_AFTER_MS = 3_000;

export function useYoutubeSync(input: { videoId: string | null; state: BattleAudioState | null; clockOffsetMs: number; volume: number; muted: boolean }): {
  ref: (el: HTMLDivElement | null) => void;
  needsTap: boolean;
  failed: boolean;
} {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  const [player, setPlayer] = useState<YtPlayer | null>(null);

  const [needsTap, setNeedsTap] = useState(false);

  const [failed, setFailed] = useState(false);

  // PLAYING: тривалість стає відомою лише тепер — не чекаємо перевірки дрейфу
  const [starts, setStarts] = useState(0);

  const tapHint = useRef<number | undefined>(undefined);

  const { videoId } = input;

  useEffect(() => {
    if (!host || !videoId) return;

    let alive = true;

    let created: YtPlayer | null = null;

    const mount = document.createElement("div");

    host.appendChild(mount);

    void loadYoutubeIframeApi().then(
      (YT) => {
        if (!alive) return;

        created = new YT.Player(mount, {
          host: YOUTUBE_NOCOOKIE_HOST,
          videoId,
          width: YOUTUBE_PLAYER_PX,
          height: YOUTUBE_PLAYER_PX,
          playerVars: { autoplay: 0, controls: 1, loop: 1, playlist: videoId, playsinline: 1, rel: 0 },
          events: {
            onReady: () => alive && setPlayer(created),
            onStateChange: (e) => {
              if (e.data !== YT_STATE.PLAYING) return;

              setNeedsTap(false);
              setStarts((n) => n + 1);
            },
            onError: () => setFailed(true),
          },
        });
      },
      () => alive && setFailed(true),
    );

    return () => {
      alive = false;
      created?.destroy();
      setPlayer(null);
      setNeedsTap(false);
      setFailed(false);
      mount.remove();
    };
  }, [host, videoId]);

  const media = useMemo<MediaHandle | null>(
    () =>
      player && {
        ready: () => true,
        currentTime: () => player.getCurrentTime(),
        paused: () => player.getPlayerState() !== YT_STATE.PLAYING,
        duration: () => player.getDuration() || null,
        play: () => {
          player.playVideo();
          // iOS може проігнорувати playVideo без дотику до самого плеєра
          window.clearTimeout(tapHint.current);
          tapHint.current = window.setTimeout(() => setNeedsTap(player.getPlayerState() !== YT_STATE.PLAYING), TAP_HINT_AFTER_MS);
        },
        pause: () => player.pauseVideo(),
        // до метаданих ціль не загорнута в петлю; наступна перевірка дрейфу перемотає
        seek: (sec) => {
          if (player.getDuration()) player.seekTo(sec, true);
        },
      },
    [player],
  );

  const { state, clockOffsetMs, volume, muted } = input;

  useDriftSync(media, { state, clockOffsetMs, canPlay: true, resyncKey: starts });

  useEffect(() => {
    if (!player) return;

    player.setVolume(Math.round(volume * 100));

    if (muted) player.mute();
    else player.unMute();
  }, [player, volume, muted]);

  useEffect(() => () => window.clearTimeout(tapHint.current), [player]);

  return { ref: setHost, needsTap, failed };
}
