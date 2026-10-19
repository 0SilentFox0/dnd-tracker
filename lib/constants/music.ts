export const BATTLE_MUSIC_BUCKET = "battle-music";

export const MAX_TRACK_BYTES = 10 * 1024 * 1024;

export const MAX_TRACKS_PER_CAMPAIGN = 40;

export const TRACK_TITLE_MAX = 120;

export const TRACK_CACHE_SECONDS = "31536000";

export const TRACK_FORMATS = {
  mp3: { ext: "mp3", contentType: "audio/mpeg" },
  m4a: { ext: "m4a", contentType: "audio/mp4" },
} as const;

export const TRACK_CONTENT_TYPES: string[] = Object.values(TRACK_FORMATS).map((f) => f.contentType);

export const AUDIO_DRIFT_TOLERANCE_SEC = 1.5;

export const AUDIO_DRIFT_CHECK_MS = 10_000;

/** Мінімум YouTube Required Minimum Functionality */
export const YOUTUBE_PLAYER_PX = 200;

export const YOUTUBE_NOCOOKIE_HOST = "https://www.youtube-nocookie.com";

export const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

export const AUDIO_VOLUME_KEY = "battle-music-volume";

export const AUDIO_MUTED_KEY = "battle-music-muted";

export const DEFAULT_AUDIO_VOLUME = 0.6;
