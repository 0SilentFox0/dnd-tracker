import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_SLIDE_BYTES, SCENE_SLIDES_BUCKET, SLIDE_BUCKET_TYPES, SLIDE_FORMATS, type SlideUploadType } from "@/lib/constants/show";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { bucketObjectPath } from "@/lib/utils/common/image-url";
import type { Result } from "@/types/common";
import type { SlideUploadTicket } from "@/types/show";

type Admin = ReturnType<typeof createAdminClient>;

/** Ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL. Викликати до дзеркалювання, щоб бакет не створився без лімітів. */
export function ensureSlidesBucket(supabase: Admin) {
  return ensureBucket(supabase, SCENE_SLIDES_BUCKET, { public: true, fileSizeLimit: MAX_SLIDE_BYTES, allowedMimeTypes: SLIDE_BUCKET_TYPES });
}

export async function createSlideUploadTicket(campaignId: string, contentType: SlideUploadType): Promise<Result<SlideUploadTicket>> {
  const supabase = createAdminClient();

  const ensured = await ensureSlidesBucket(supabase);

  if (!ensured.ok) return ensured;

  const bucket = supabase.storage.from(SCENE_SLIDES_BUCKET);

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${SLIDE_FORMATS[contentType]}`;

  const { data, error } = await bucket.createSignedUploadUrl(path);

  if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

  return { ok: true, value: { bucket: SCENE_SLIDES_BUCKET, path: data.path, token: data.token, contentType, publicUrl: bucket.getPublicUrl(data.path).data.publicUrl } };
}

const OBJECT_NAME = new RegExp(`^[a-f0-9]{32}\\.(${Object.values(SLIDE_FORMATS).join("|")})$`);

export function ownedSlidePath(campaignId: string, url: string): string | null {
  const path = bucketObjectPath(url, SCENE_SLIDES_BUCKET);

  return path?.startsWith(`${campaignId}/`) && OBJECT_NAME.test(path.slice(campaignId.length + 1)) ? path : null;
}

export async function removeSlideFiles(campaignId: string, urls: string[], options: { strict?: boolean } = {}): Promise<void> {
  const paths = urls.flatMap((url) => ownedSlidePath(campaignId, url) ?? []);

  if (paths.length === 0) return;

  try {
    const { error } = await createAdminClient().storage.from(SCENE_SLIDES_BUCKET).remove(paths);

    if (error && options.strict) throw new Error("Не вдалося очистити медіа");

    if (error) console.warn("[scene-slides] remove failed", paths, error.message);
  } catch (e) {
    if (options.strict) throw new Error("Не вдалося очистити медіа");

    console.warn("[scene-slides] remove failed", paths, e);
  }
}
