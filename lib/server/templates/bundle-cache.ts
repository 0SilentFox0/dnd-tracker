import type { Bundle, TemplateDb } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";

const MAX_ENTRIES = 4;

const cache = new Map<string, Promise<Bundle>>();

/** Raw exported bundle, keyed by source version. Callers must treat it as read-only; SRD localisation happens outside. */
export function cachedExport(db: TemplateDb, sourceId: string, contentVersion: number): Promise<Bundle> {
  const key = `${sourceId}:${contentVersion}`;

  const hit = cache.get(key);

  if (hit) {
    cache.delete(key);
    cache.set(key, hit);

    return hit;
  }

  const pending = exportCampaign(db, sourceId);

  cache.set(key, pending);

  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });

  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);

  return pending;
}

export const clearBundleCache = () => cache.clear();
