import { YOUTUBE_IFRAME_API_SRC } from "@/lib/constants/music";

export interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

export interface YtPlayerOptions {
  host: string;
  videoId: string;
  width: number;
  height: number;
  playerVars: Record<string, string | number>;
  events: { onReady?(): void; onStateChange?(e: { data: number }): void; onError?(e: { data: number }): void };
}

export interface YtNamespace {
  Player: new (el: HTMLElement, options: YtPlayerOptions) => YtPlayer;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const;

let loading: Promise<YtNamespace> | null = null;

/** Скрипт YouTube вантажимо лише коли гравець увімкнув звук на YouTube-треку. */
export function loadYoutubeIframeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  loading ??= new Promise<YtNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previous?.();

      if (window.YT) resolve(window.YT);
    };

    const script = document.createElement("script");

    script.src = YOUTUBE_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("YouTube API failed to load"));
    };
    document.head.appendChild(script);
  });

  return loading;
}
