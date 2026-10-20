"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { YOUTUBE_NOCOOKIE_HOST, YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { loadYoutubeIframeApi, YT_STATE, type YtPlayer } from "@/lib/utils/audio/youtube-iframe-api";
import type { CampaignTrack } from "@/types/audio";

export interface TrackPreview {
  playingId: string | null;
  failedId: string | null;
  /** частка 0..1; null — тривалість невідома */
  progress: number | null;
  toggle(track: CampaignTrack): void;
  stop(): void;
}

const TICK_MS = 500;

interface Source {
  stop(): void;
  position(): number | null;
}

function fileSource(url: string, onEnd: () => void, onError: () => void): Source {
  const audio = new Audio(url);

  audio.addEventListener("ended", onEnd);
  audio.addEventListener("error", onError);
  audio.play().catch(onError);

  return {
    stop: () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    },
    position: () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : null),
  };
}

function youtubeSource(videoId: string, onEnd: () => void, onError: () => void): Source {
  // iframe мусить бути в документі; поза екраном, щоб не ламати розмітку
  const host = document.createElement("div");

  host.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden";
  host.setAttribute("aria-hidden", "true");

  const mount = document.createElement("div");

  host.appendChild(mount);
  document.body.appendChild(host);

  let player: YtPlayer | null = null;

  let alive = true;

  void loadYoutubeIframeApi().then(
    (YT) => {
      if (!alive) return;

      player = new YT.Player(mount, {
        host: YOUTUBE_NOCOOKIE_HOST,
        videoId,
        width: YOUTUBE_PLAYER_PX,
        height: YOUTUBE_PLAYER_PX,
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0 },
        events: {
          onReady: () => alive && player?.playVideo(),
          onStateChange: (e) => {
            if (alive && e.data === YT_STATE.ENDED) onEnd();
          },
          onError,
        },
      });
    },
    onError,
  );

  return {
    stop: () => {
      alive = false;
      player?.destroy();
      host.remove();
    },
    position: () => {
      if (!alive || !player) return null;

      const duration = player.getDuration?.();

      return duration ? player.getCurrentTime() / duration : null;
    },
  };
}

export function useTrackPreview(): TrackPreview {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [failedId, setFailedId] = useState<string | null>(null);

  const [progress, setProgress] = useState<number | null>(null);

  const source = useRef<Source | null>(null);

  const halt = useCallback(() => {
    source.current?.stop();
    source.current = null;
  }, []);

  const stop = useCallback(() => {
    halt();
    setPlayingId(null);
    setProgress(null);
  }, [halt]);

  const toggle = useCallback(
    (track: CampaignTrack) => {
      const wasPlaying = !!source.current && playingId === track.id;

      halt();
      setProgress(null);
      setFailedId(null);

      const onError = () => {
        halt();
        setPlayingId(null);
        setFailedId(track.id);
      };

      if (wasPlaying) setPlayingId(null);
      else if (track.kind === "file" && track.url) source.current = fileSource(track.url, stop, onError);
      else if (track.kind === "youtube" && track.youtubeId) source.current = youtubeSource(track.youtubeId, stop, onError);

      if (source.current) setPlayingId(track.id);
      else setPlayingId(null);
    },
    [halt, stop, playingId],
  );

  useEffect(() => {
    if (!playingId) return;

    const timer = window.setInterval(() => setProgress(source.current?.position() ?? null), TICK_MS);

    return () => window.clearInterval(timer);
  }, [playingId]);

  useEffect(() => halt, [halt]);

  return { playingId, failedId, progress, toggle, stop };
}
