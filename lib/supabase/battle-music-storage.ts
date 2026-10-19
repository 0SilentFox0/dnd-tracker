import { API_ERRORS } from "@/lib/constants/api-errors";
import { BATTLE_MUSIC_BUCKET, MAX_TRACK_BYTES, TRACK_CONTENT_TYPES, TRACK_FORMATS } from "@/lib/constants/music";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackFormat } from "@/lib/utils/audio/track-file";
import type { TrackUploadTicket } from "@/types/audio";

type Admin = ReturnType<typeof createAdminClient>;

const TRACK_OBJECT = /^([^/]+)\/[a-f0-9]{32}\.(mp3|m4a)$/;

const PUBLIC_MARKER = `/storage/v1/object/public/${BATTLE_MUSIC_BUCKET}/`;

export function trackPathOwnedBy(path: string, campaignId: string): boolean {
  return TRACK_OBJECT.exec(path)?.[1] === campaignId;
}

async function ensureMusicBucket(supabase: Admin): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) return { ok: false, message: error.message };

  if (data?.some((b) => b.name === BATTLE_MUSIC_BUCKET)) return { ok: true };

  // ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL
  const created = await supabase.storage.createBucket(BATTLE_MUSIC_BUCKET, { public: true, fileSizeLimit: MAX_TRACK_BYTES, allowedMimeTypes: TRACK_CONTENT_TYPES });

  return created.error ? { ok: false, message: created.error.message } : { ok: true };
}

export async function createTrackUploadTicket(campaignId: string, format: TrackFormat): Promise<{ ok: true; ticket: TrackUploadTicket } | { ok: false; message: string }> {
  const supabase = createAdminClient();

  const ensured = await ensureMusicBucket(supabase);

  if (!ensured.ok) return ensured;

  const { ext, contentType } = TRACK_FORMATS[format];

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;

  const { data, error } = await supabase.storage.from(BATTLE_MUSIC_BUCKET).createSignedUploadUrl(path);

  if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

  return { ok: true, ticket: { bucket: BATTLE_MUSIC_BUCKET, path: data.path, token: data.token, contentType } };
}

export async function verifyUploadedTrack(path: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const bucket = createAdminClient().storage.from(BATTLE_MUSIC_BUCKET);

  const { data, error } = await bucket.info(path);

  if (error || !data) return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

  const type = (data.contentType ?? "").toLowerCase();

  if (!TRACK_CONTENT_TYPES.includes(type) || !data.size || data.size > MAX_TRACK_BYTES) {
    await bucket.remove([path]);

    return { ok: false, message: API_ERRORS.TRACK_FILE_INVALID };
  }

  return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
}

export function trackObjectPath(url: string): string | null {
  try {
    const { pathname } = new URL(url);

    const at = pathname.indexOf(PUBLIC_MARKER);

    return at === -1 ? null : decodeURIComponent(pathname.slice(at + PUBLIC_MARKER.length));
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
