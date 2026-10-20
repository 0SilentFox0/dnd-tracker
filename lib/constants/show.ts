export const SCENE_SLIDES_BUCKET = "scene-slides";

export const MAX_SLIDE_MB = 8;

export const MAX_SLIDE_BYTES = MAX_SLIDE_MB * 1024 * 1024;

export const MAX_SLIDES_PER_DECK = 100;

export const MAX_DECKS_PER_CAMPAIGN = 100;

export const DECK_TITLE_MAX = 80;

export const SLIDE_TITLE_MAX = 80;

export const SLIDE_CAPTION_MAX = 200;

export const SLIDE_MAX_EDGE_PX = 2560;

export const SLIDE_CACHE_SECONDS = "31536000";

/** Що клієнт вантажить напряму (після зменшення). */
export const SLIDE_UPLOAD_FORMATS = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
} as const;

export type SlideUploadType = keyof typeof SLIDE_UPLOAD_FORMATS;

export const SLIDE_UPLOAD_TYPES = Object.keys(SLIDE_UPLOAD_FORMATS) as [SlideUploadType, ...SlideUploadType[]];

/** Бакет приймає й те, що дзеркалиться за посиланням (resolveImageForPersistence). */
export const SLIDE_BUCKET_TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif"];

export const SLIDE_FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export const SLIDE_CROSSFADE_MS = 600;
