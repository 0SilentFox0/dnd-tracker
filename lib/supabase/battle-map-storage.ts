import { resolveImageForPersistence, YEAR_CACHE_SECONDS } from "@/lib/supabase/image-storage";

export const BATTLE_MAPS_BUCKET = "battle-maps";

const LOCAL_MAP_PATH = /^\/battle-maps\/[\w.-]+\.(webp|jpg|png)$/;

export async function resolveMapBackgroundForPersistence(
  background: string | null | undefined,
  opts: { campaignId: string; current?: string | null },
): Promise<{ ok: true; background: string | null | undefined } | { ok: false; message: string }> {
  if (!background || LOCAL_MAP_PATH.test(background)) return { ok: true, background };

  const r = await resolveImageForPersistence(background, { ...opts, bucket: BATTLE_MAPS_BUCKET, cacheControl: YEAR_CACHE_SECONDS });

  return r.ok ? { ok: true, background: r.value } : r;
}
