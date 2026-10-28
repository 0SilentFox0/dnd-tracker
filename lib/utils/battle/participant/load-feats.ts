import { getCachedFeats } from "@/lib/cache/reference-data";
import { toFeatData } from "@/lib/utils/feats/row";
import type { FeatData } from "@/types/choices";

export async function loadFeatsById(campaignId: string, needed: boolean, preloaded?: Record<string, FeatData>): Promise<Record<string, FeatData>> {
  if (preloaded !== undefined) return preloaded;

  if (!needed) return {};

  return Object.fromEntries((await getCachedFeats(campaignId)).map(toFeatData).map((f) => [f.id, f]));
}
