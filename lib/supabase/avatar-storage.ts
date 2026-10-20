import { resolveImageForPersistence, YEAR_CACHE_SECONDS } from "@/lib/supabase/image-storage";

export const AVATARS_BUCKET = "avatars";

export async function resolveAvatarForPersistence(
  avatar: string | null | undefined,
  opts: { campaignId: string; current?: string | null },
): Promise<{ ok: true; avatar: string | null | undefined } | { ok: false; message: string }> {
  const r = await resolveImageForPersistence(avatar, { ...opts, bucket: AVATARS_BUCKET, cacheControl: YEAR_CACHE_SECONDS });

  return r.ok ? { ok: true, avatar: r.value } : r;
}
