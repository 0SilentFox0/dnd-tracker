import { API_ERRORS } from "@/lib/constants/api-errors";
import { BATTLE_MUSIC_BUCKET, MAX_TRACK_BYTES, TRACK_CONTENT_TYPES, TRACK_EXTENSIONS, TRACK_FORMATS,type TrackFormat } from "@/lib/constants/music";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { parsePublicStorageUrl } from "@/lib/utils/common/image-url";
import type { TrackUploadTicket } from "@/types/audio";
import type { Result } from "@/types/common";

type Admin = ReturnType<typeof createAdminClient>;

const TRACK_OBJECT = new RegExp(`^([^/]+)/[a-f0-9]{32}\\.(${TRACK_EXTENSIONS.join("|")})$`);

const BUCKET_PREFIX = `${BATTLE_MUSIC_BUCKET}/`;

export function trackPathOwnedBy(path: string, campaignId: string): boolean {
  return TRACK_OBJECT.exec(path)?.[1] === campaignId;
}

type Bucket = ReturnType<Admin["storage"]["from"]>;

async function musicBucket(supabase: Admin): Promise<Result<Bucket>> {
  // ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL
  const ensured = await ensureBucket(supabase, BATTLE_MUSIC_BUCKET, { public: true, fileSizeLimit: MAX_TRACK_BYTES, allowedMimeTypes: TRACK_CONTENT_TYPES });

  return ensured.ok ? { ok: true, value: supabase.storage.from(BATTLE_MUSIC_BUCKET) } : ensured;
}

export async function createTrackUploadTicket(campaignId: string, format: TrackFormat): Promise<Result<TrackUploadTicket>> {
  const bucket = await musicBucket(createAdminClient());

  if (!bucket.ok) return bucket;

  const { ext, contentType } = TRACK_FORMATS[format];

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;

  const { data, error } = await bucket.value.createSignedUploadUrl(path);

  if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

  return { ok: true, value: { bucket: BATTLE_MUSIC_BUCKET, path: data.path, token: data.token, contentType } };
}

export async function verifyUploadedTrack(path: string): Promise<Result<string>> {
  const bucket = createAdminClient().storage.from(BATTLE_MUSIC_BUCKET);

  const { data, error } = await bucket.info(path);

  if (error || !data) return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

  const type = (data.contentType ?? "").toLowerCase();

  if (!TRACK_CONTENT_TYPES.includes(type) || !data.size || data.size > MAX_TRACK_BYTES) {
    await bucket.remove([path]);

    return { ok: false, message: API_ERRORS.TRACK_FILE_INVALID };
  }

  return { ok: true, value: bucket.getPublicUrl(path).data.publicUrl };
}

export function trackObjectPath(url: string): string | null {
  const key = parsePublicStorageUrl(url)?.key;

  if (!key?.startsWith(BUCKET_PREFIX)) return null;

  try {
    return decodeURIComponent(key.slice(BUCKET_PREFIX.length));
  } catch {
    return null;
  }
}

export async function removeTrackFile(url: string): Promise<void> {
  const path = trackObjectPath(url);

  if (!path) return;

  try {
    const { error } = await createAdminClient().storage.from(BATTLE_MUSIC_BUCKET).remove([path]);

    if (error) console.warn("[battle-music] remove failed", path, error.message);
  } catch (e) {
    console.warn("[battle-music] remove failed", path, e);
  }
}
