export interface CampaignLayer { sourceId: string; version: number; contentVersion: number }

export interface Overlay { hidden: Set<string>; shadowed: Set<string> }

const LAYER_TTL_MS = 30_000;

const BASE_ROWS_MAX = 128;

const OVERLAYS_MAX = 512;

class Lru<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly max: number) {}

  get(key: string): V | undefined {
    const value = this.map.get(key);

    if (value === undefined) return undefined;

    this.map.delete(key);
    this.map.set(key, value);

    return value;
  }

  set(key: string, value: V) {
    this.map.delete(key);
    this.map.set(key, value);

    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }

  deleteWhere(predicate: (key: string) => boolean) {
    for (const key of [...this.map.keys()]) if (predicate(key)) this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

const layers = new Map<string, { at: number; layer: CampaignLayer | null }>();

/** Shared by every campaign on the same published version: key = `source|version|model|query`. Rows are immutable per version. */
const baseRows = new Lru<Array<Record<string, unknown>>>(BASE_ROWS_MAX);

/** Per campaign: hidden base ids and base ids shadowed by a local override. Key = `campaign|contentVersion|model`. */
const overlays = new Lru<Overlay>(OVERLAYS_MAX);

export const layerStats = { campaignLookups: 0 };

export const getLayer = (campaignId: string) => {
  const hit = layers.get(campaignId);

  return hit && Date.now() - hit.at < LAYER_TTL_MS ? hit : undefined;
};

export const setLayer = (campaignId: string, layer: CampaignLayer | null) => layers.set(campaignId, { at: Date.now(), layer });

export const baseRowsKey = (layer: CampaignLayer, model: string, signature: string) => `${layer.sourceId}|${layer.version}|${model}|${signature}`;

export const baseRowsCache = baseRows;

export const overlayKey = (campaignId: string, layer: CampaignLayer, model: string) => `${campaignId}|${layer.contentVersion}|${model}`;

export const overlayCache = overlays;

/** The one invalidation point: campaign layer lookup, overlays, and (without an id) the shared base rows. */
export function invalidateCampaignLayer(campaignId?: string) {
  if (!campaignId) {
    layers.clear();
    baseRows.clear();
    overlays.clear();

    return;
  }

  layers.delete(campaignId);
  overlays.deleteWhere((key) => key.startsWith(`${campaignId}|`));
}
