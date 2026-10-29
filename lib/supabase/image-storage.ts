import { API_ERRORS } from "@/lib/constants/api-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { safeFetchBuffer, SafeFetchError, sniffImageMime } from "@/lib/utils/api/safe-fetch";
import { isHostedOnProjectStorage } from "@/lib/utils/common/image-url";
import type { Result } from "@/types/common";

export type ImageTarget = {
  bucket: string;
  campaignId: string;
  cacheControl?: string;
};

type StoredImage = ImageTarget & { objectBaseName: string };

type PersistOptions = ImageTarget & {
  current?: string | null;
  objectBaseName?: string;
};

export { isHostedOnProjectStorage };
export { YEAR_CACHE_SECONDS } from "@/lib/constants/storage";

const MAX_BYTES = 5 * 1024 * 1024;

/** base64 роздуває файл ~на 33%. */
const MAX_DATA_URL_CHARS = 7 * 1024 * 1024;

const STORED_URL_MAX_LEN = 2000;

const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const ALLOWED_MIME = new Set([...Object.keys(EXTENSIONS), "image/jpg"]);

const FORMATS_ERROR = API_ERRORS.IMAGE_FORMATS;

function shouldMirror(url: string): boolean {
  return (url.startsWith("http://") || url.startsWith("https://")) && !isHostedOnProjectStorage(url);
}

function isImageDataUrl(value: string): boolean {
  return value.length <= MAX_DATA_URL_CHARS && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

/** Шлях: `{campaignId}/{objectBaseName}{ext}`, upsert. */
async function putImage(buffer: Buffer, mime: string, target: StoredImage): Promise<Result<string>> {
  let supabase: ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch {
    return { ok: false, message: API_ERRORS.IMAGE_STORAGE_NOT_CONFIGURED };
  }

  const ensured = await ensureBucket(supabase, target.bucket);

  if (!ensured.ok) return ensured;

  const safeBase = target.objectBaseName.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!safeBase) return { ok: false, message: API_ERRORS.IMAGE_NAME_INVALID };

  const fullPath = `${target.campaignId}/${safeBase}${EXTENSIONS[mime] ?? ".png"}`;

  const bucket = supabase.storage.from(target.bucket);

  const { error } = await bucket.upload(fullPath, buffer, { contentType: mime, upsert: true, cacheControl: target.cacheControl });

  if (error) return { ok: false, message: error.message };

  return { ok: true, value: bucket.getPublicUrl(fullPath).data.publicUrl };
}

/** Клієнтський прев’ю через FileReader (data:image/...;base64,...); після decode — ліміт 5 МБ. */
export async function uploadImageDataUrl(dataUrl: string, target: StoredImage): Promise<Result<string>> {
  const trimmed = dataUrl.trim();

  if (trimmed.length > MAX_DATA_URL_CHARS) return { ok: false, message: API_ERRORS.IMAGE_DATA_TOO_LARGE };

  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);

  if (!match) return { ok: false, message: API_ERRORS.IMAGE_DATA_URL_INVALID };

  let mime = match[1].toLowerCase();

  if (mime === "image/jpg") mime = "image/jpeg";

  if (!ALLOWED_MIME.has(mime)) return { ok: false, message: FORMATS_ERROR };

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

  if (buffer.length === 0) return { ok: false, message: API_ERRORS.IMAGE_EMPTY };

  if (buffer.length > MAX_BYTES) return { ok: false, message: API_ERRORS.IMAGE_FILE_TOO_LARGE };

  if (sniffImageMime(buffer) !== mime) return { ok: false, message: FORMATS_ERROR };

  return putImage(buffer, mime, target);
}

export async function mirrorImageUrl(sourceUrl: string, target: StoredImage): Promise<Result<string>> {
  let fetched: Awaited<ReturnType<typeof safeFetchBuffer>>;

  try {
    fetched = await safeFetchBuffer(sourceUrl, {
      maxBytes: MAX_BYTES,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DnD-Combat-Tracker/1.0)" },
    });
  } catch (e) {
    return { ok: false, message: e instanceof SafeFetchError ? e.message : API_ERRORS.SAFE_FETCH_FAILED };
  }

  if (fetched.status < 200 || fetched.status >= 300) {
    return { ok: false, message: API_ERRORS.IMAGE_FETCH_FAILED, params: { status: fetched.status } };
  }

  const declared = fetched.contentType?.split(";")[0].trim().toLowerCase() ?? "";

  if (!declared.startsWith("image/")) return { ok: false, message: API_ERRORS.IMAGE_URL_NOT_IMAGE };

  const mime = sniffImageMime(fetched.body);

  if (!ALLOWED_MIME.has(declared) || !mime) return { ok: false, message: FORMATS_ERROR };

  return putImage(fetched.body, mime, target);
}

/**
 * Значення зображення для БД: незмінене або вже наше — як є; зовнішній URL дзеркалиться,
 * data URL вантажиться, інакше — короткий рядок як є. `undefined` — поле не змінюється.
 */
export function resolveImageForPersistence(value: string | null, options: PersistOptions): Promise<Result<string | null>>;
export function resolveImageForPersistence(value: string | null | undefined, options: PersistOptions): Promise<Result<string | null | undefined>>;
export async function resolveImageForPersistence(
  value: string | null | undefined,
  { current, objectBaseName, ...target }: PersistOptions,
): Promise<Result<string | null | undefined>> {
  if (value === undefined) return { ok: true, value };

  if (value && value === current) return { ok: true, value };

  const t = value?.trim() ?? "";

  if (!t) return { ok: true, value: null };

  if (isHostedOnProjectStorage(t)) return { ok: true, value: t };

  // a new object per upload keeps long cacheControl valid
  const stored = { ...target, objectBaseName: objectBaseName ?? crypto.randomUUID().replace(/-/g, "") };

  if (shouldMirror(t)) return mirrorImageUrl(t, stored);

  if (isImageDataUrl(t)) return uploadImageDataUrl(t, stored);

  if (t.length > STORED_URL_MAX_LEN) {
    return { ok: false, message: API_ERRORS.IMAGE_URL_TOO_LONG, params: { max: STORED_URL_MAX_LEN } };
  }

  return { ok: true, value: t };
}
