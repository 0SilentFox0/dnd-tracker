import { API_ERRORS } from "@/lib/constants/api-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { bucketObjectPath } from "@/lib/utils/common/image-url";
import type { Result } from "@/types/common";
import type { SlideUploadTicket } from "@/types/show";

type Admin = ReturnType<typeof createAdminClient>;

interface ImageBucketConfig<T extends string> {
  bucket: string;
  maxBytes: number;
  formats: Record<T, string>;
  bucketTypes: readonly string[];
  logTag: string;
}

export function imageBucketStorage<T extends string>({ bucket, maxBytes, formats, bucketTypes, logTag }: ImageBucketConfig<T>) {
  const objectName = new RegExp(`^[a-f0-9]{32}\\.(${Object.values<string>(formats).join("|")})$`);

  /** Ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL. Викликати до дзеркалювання, щоб бакет не створився без лімітів. */
  const ensure = (supabase: Admin) => ensureBucket(supabase, bucket, { public: true, fileSizeLimit: maxBytes, allowedMimeTypes: [...bucketTypes] });

  async function createTicket(campaignId: string, contentType: T): Promise<Result<SlideUploadTicket>> {
    const supabase = createAdminClient();

    const ensured = await ensure(supabase);

    if (!ensured.ok) return ensured;

    const storage = supabase.storage.from(bucket);

    const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${formats[contentType]}`;

    const { data, error } = await storage.createSignedUploadUrl(path);

    if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

    return { ok: true, value: { bucket, path: data.path, token: data.token, contentType, publicUrl: storage.getPublicUrl(data.path).data.publicUrl } };
  }

  function ownedPath(campaignId: string, url: string): string | null {
    const path = bucketObjectPath(url, bucket);

    return path?.startsWith(`${campaignId}/`) && objectName.test(path.slice(campaignId.length + 1)) ? path : null;
  }

  async function remove(campaignId: string, urls: string[]): Promise<void> {
    const paths = urls.flatMap((url) => ownedPath(campaignId, url) ?? []);

    if (paths.length === 0) return;

    try {
      const { error } = await createAdminClient().storage.from(bucket).remove(paths);

      if (error) console.warn(`[${logTag}] remove failed`, paths, error.message);
    } catch (e) {
      console.warn(`[${logTag}] remove failed`, paths, e);
    }
  }

  return { ensure, createTicket, ownedPath, remove };
}
