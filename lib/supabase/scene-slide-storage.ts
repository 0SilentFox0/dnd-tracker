import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_SLIDE_BYTES, SCENE_SLIDES_BUCKET, SLIDE_BUCKET_TYPES, SLIDE_UPLOAD_FORMATS, type SlideUploadType } from "@/lib/constants/show";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { parsePublicStorageUrl } from "@/lib/utils/common/image-url";
import type { Result } from "@/types/common";
import type { SlideUploadTicket } from "@/types/show";

type Admin = ReturnType<typeof createAdminClient>;

const BUCKET_PREFIX = `${SCENE_SLIDES_BUCKET}/`;

/** Ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL. Викликати до дзеркалювання, щоб бакет не створився без лімітів. */
export function ensureSlidesBucket(supabase: Admin) {
  return ensureBucket(supabase, SCENE_SLIDES_BUCKET, { public: true, fileSizeLimit: MAX_SLIDE_BYTES, allowedMimeTypes: SLIDE_BUCKET_TYPES });
}

export async function createSlideUploadTicket(campaignId: string, contentType: SlideUploadType): Promise<Result<SlideUploadTicket>> {
  const supabase = createAdminClient();

  const ensured = await ensureSlidesBucket(supabase);

  if (!ensured.ok) return ensured;

  const bucket = supabase.storage.from(SCENE_SLIDES_BUCKET);

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${SLIDE_UPLOAD_FORMATS[contentType]}`;

  const { data, error } = await bucket.createSignedUploadUrl(path);

  if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

  return { ok: true, value: { bucket: SCENE_SLIDES_BUCKET, path: data.path, token: data.token, contentType, publicUrl: bucket.getPublicUrl(data.path).data.publicUrl } };
}

export function slideObjectPath(url: string): string | null {
  const key = parsePublicStorageUrl(url)?.key;

  if (!key?.startsWith(BUCKET_PREFIX)) return null;

  try {
    return decodeURIComponent(key.slice(BUCKET_PREFIX.length));
  } catch {
    return null;
  }
}

/** Лише об'єкти цієї кампанії в бакеті слайдів; помилки — у лог, не користувачу. */
export async function removeSlideFiles(campaignId: string, urls: string[]): Promise<void> {
  const paths = urls.map(slideObjectPath).filter((p): p is string => !!p && p.startsWith(`${campaignId}/`));

  if (paths.length === 0) return;

  try {
    const { error } = await createAdminClient().storage.from(SCENE_SLIDES_BUCKET).remove(paths);

    if (error) console.warn("[scene-slides] remove failed", paths, error.message);
  } catch (e) {
    console.warn("[scene-slides] remove failed", paths, e);
  }
}
