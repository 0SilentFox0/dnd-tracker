import sharp from "sharp";

import "server-only";
import { YEAR_CACHE_SECONDS } from "@/lib/constants/storage";
import type { FetchedImage } from "@/lib/server/compendium-import/media/fetch-image";
import { MEDIA_LIMITS, type MediaRole } from "@/lib/server/compendium-import/media/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import type { Result } from "@/types/common";

type Admin = ReturnType<typeof createAdminClient>;

export const COMPENDIUM_MEDIA_BUCKET = "compendium-media";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const MAX_EDGE: Record<MediaRole, number> = { avatar: 512, icon: 512, inline: 1600 };

const WEBP_QUALITY = 80;

const STORAGE_TIMEOUT_MS = 15_000;

const isDuplicate = (error: { message?: string; statusCode?: string | number }) =>
  String(error.statusCode) === "409" || /duplicate|already exists/i.test(error.message ?? "");

async function encode(image: Extract<FetchedImage, { ok: true }>, variant: MediaRole) {
  if (image.mime === "image/gif") {
    return { bytes: image.bytes, mime: image.mime, path: `${image.sha256.slice(0, 2)}/${image.sha256}.gif` };
  }

  const max = MAX_EDGE[variant];

  const bytes = await sharp(image.bytes).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer();

  return { bytes, mime: "image/webp", path: `${image.sha256.slice(0, 2)}/${image.sha256}-${max}.webp` };
}

/** Result.message is a MediaReason key. */
export async function storeCompendiumImage(
  image: Extract<FetchedImage, { ok: true }>,
  variant: MediaRole,
  admin?: Admin,
): Promise<Result<string>> {
  let encoded: Awaited<ReturnType<typeof encode>>;

  try {
    encoded = await encode(image, variant);
  } catch {
    return { ok: false, message: "MEDIA_BAD_FORMAT" };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<Result<string>>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, message: "MEDIA_STORAGE_FAILED" }), STORAGE_TIMEOUT_MS);
  });

  const upload = async (): Promise<Result<string>> => {
    try {
      const supabase = admin ?? createAdminClient();

      const ensured = await ensureBucket(supabase, COMPENDIUM_MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: MEDIA_LIMITS.bytes,
        allowedMimeTypes: ALLOWED_MIME,
      });

      if (!ensured.ok) return { ok: false, message: "MEDIA_STORAGE_FAILED" };

      const storage = supabase.storage.from(COMPENDIUM_MEDIA_BUCKET);

      const { error } = await storage.upload(encoded.path, encoded.bytes, {
        contentType: encoded.mime,
        upsert: false,
        cacheControl: YEAR_CACHE_SECONDS,
      });

      if (error && !isDuplicate(error as { message?: string; statusCode?: string })) return { ok: false, message: "MEDIA_STORAGE_FAILED" };

      return { ok: true, value: storage.getPublicUrl(encoded.path).data.publicUrl };
    } catch {
      return { ok: false, message: "MEDIA_STORAGE_FAILED" };
    }
  };

  try {
    return await Promise.race([upload(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
