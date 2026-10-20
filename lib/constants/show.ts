export const SCENE_SLIDES_BUCKET = "scene-slides";

export const MAX_SLIDE_MB = 8;

export const MAX_SLIDE_BYTES = MAX_SLIDE_MB * 1024 * 1024;

export const MAX_SLIDES_PER_DECK = 100;

export const MAX_DECKS_PER_CAMPAIGN = 100;

export const DECK_TITLE_MAX = 80;

export const SLIDE_TITLE_MAX = 80;

export const SLIDE_CAPTION_MAX = 200;

export const SLIDE_MAX_EDGE_PX = 2560;

/** Бакет приймає й те, що дзеркалиться за посиланням (resolveImageForPersistence). */
export const SLIDE_FORMATS = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
} as const;

/** Що клієнт вантажить напряму (після зменшення). */
export const SLIDE_UPLOAD_TYPES = ["image/webp", "image/jpeg"] as const satisfies readonly (keyof typeof SLIDE_FORMATS)[];

export type SlideUploadType = (typeof SLIDE_UPLOAD_TYPES)[number];

export const SLIDE_BUCKET_TYPES = Object.keys(SLIDE_FORMATS);

export const SLIDE_FILE_ACCEPT = SLIDE_BUCKET_TYPES.join(",");

export const SLIDE_CROSSFADE_MS = 600;
