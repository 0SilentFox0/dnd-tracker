import { isArtifactIconHostedOnProjectStorage, resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";

export const AVATARS_BUCKET = "avatars";

const YEAR_SECONDS = "31536000";

export async function resolveAvatarForPersistence(
  avatar: string | null | undefined,
  opts: { campaignId: string },
): Promise<{ ok: true; avatar: string | null | undefined } | { ok: false; message: string }> {
  if (avatar === undefined) return { ok: true, avatar: undefined };

  if (avatar && isArtifactIconHostedOnProjectStorage(avatar)) return { ok: true, avatar };

  // a new object per upload keeps the year-long cache valid
  const r = await resolveArtifactIconForPersistence(avatar, {
    campaignId: opts.campaignId,
    objectBaseName: crypto.randomUUID().replace(/-/g, ""),
    bucket: AVATARS_BUCKET,
    cacheControl: YEAR_SECONDS,
  });

  return r.ok ? { ok: true, avatar: r.icon } : r;
}
