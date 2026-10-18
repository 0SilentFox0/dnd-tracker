import { isArtifactIconHostedOnProjectStorage, resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";

export const BATTLE_MAPS_BUCKET = "battle-maps";

const YEAR_SECONDS = "31536000";

const LOCAL_MAP_PATH = /^\/battle-maps\/[\w.-]+\.(webp|jpg|png)$/;

export async function resolveMapBackgroundForPersistence(
  background: string | null | undefined,
  opts: { campaignId: string; current?: string | null },
): Promise<{ ok: true; background: string | null | undefined } | { ok: false; message: string }> {
  if (!background) return { ok: true, background };

  if (background === opts.current) return { ok: true, background };

  if (LOCAL_MAP_PATH.test(background) || isArtifactIconHostedOnProjectStorage(background)) return { ok: true, background };

  const r = await resolveArtifactIconForPersistence(background, {
    campaignId: opts.campaignId,
    objectBaseName: crypto.randomUUID().replace(/-/g, ""),
    bucket: BATTLE_MAPS_BUCKET,
    cacheControl: YEAR_SECONDS,
  });

  return r.ok ? { ok: true, background: r.icon } : r;
}
