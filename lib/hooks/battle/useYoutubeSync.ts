"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AUDIO_DRIFT_CHECK_MS, YOUTUBE_NOCOOKIE_HOST, YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { audioPosition, planSync } from "@/lib/utils/audio/position";
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

  const latest = useRef(input);

  const tapHint = useRef<number | undefined>(undefined);

  useEffect(() => {
    latest.current = input;
  });

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
            onStateChange: (e) => e.data === YT_STATE.PLAYING && setNeedsTap(false),
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

  const sync = useCallback(() => {
    if (!player) return;

    const { state, clockOffsetMs, volume, muted } = latest.current;

    player.setVolume(Math.round(volume * 100));

    if (muted) player.mute();
    else player.unMute();

    const durationSec = player.getDuration() || null;

    const target = state ? audioPosition(state, { now: Date.now(), clockOffsetMs, durationSec }) : 0;

    const paused = player.getPlayerState() !== YT_STATE.PLAYING;

    const plan = planSync({ shouldPlay: !!state?.playing, paused, current: player.getCurrentTime(), target, durationSec });

    if (plan.pause) player.pauseVideo();

    // до метаданих ціль не загорнута в петлю; наступна перевірка дрейфу перемотає
    if (plan.seekTo !== null && durationSec) player.seekTo(plan.seekTo, true);

    if (plan.play) {
      player.playVideo();
      // iOS може проігнорувати playVideo без дотику до самого плеєра
      window.clearTimeout(tapHint.current);
      tapHint.current = window.setTimeout(() => setNeedsTap(player.getPlayerState() !== YT_STATE.PLAYING), TAP_HINT_AFTER_MS);
    }
  }, [player]);

  const { state, clockOffsetMs, volume, muted } = input;

  useEffect(() => {
    sync();
  }, [sync, state, clockOffsetMs, volume, muted]);

  useEffect(() => {
    if (!player) return;

    const timer = window.setInterval(sync, AUDIO_DRIFT_CHECK_MS);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(tapHint.current);
    };
  }, [player, sync]);

  return { ref: setHost, needsTap, failed };
}
