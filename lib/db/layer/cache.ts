export interface CampaignLayer { sourceId: string; version: number; contentVersion: number }

export interface Overlay { hidden: Set<string>; shadowed: Set<string> }

const PLAIN_MAX = 4096;

export const PLAIN_TTL_MS = 60_000;

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

  delete(key: string) {
    this.map.delete(key);
  }

  deleteWhere(predicate: (key: string) => boolean) {
    for (const key of [...this.map.keys()]) if (predicate(key)) this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

/** Campaigns known to have no base (value = time marked). baseSourceId changes once, at legacy migration (Part 5); TTL bounds stale marks on other instances. */
const plain = new Lru<number>(PLAIN_MAX);

/** Shared by every campaign on the same published version: key = `source|version|model|query`. Rows are immutable per version. */
const baseRows = new Lru<Array<Record<string, unknown>>>(BASE_ROWS_MAX);

/** Per campaign: hidden base ids and base ids shadowed by a local override. Key = `campaign|baseVersion|contentVersion|model`; never filled from a write context or open transaction. */
const overlays = new Lru<Overlay>(OVERLAYS_MAX);

export const layerStats = { campaignLookups: 0 };

export function isPlainCampaign(campaignId: string, now = Date.now()): boolean {
  const markedAt = plain.get(campaignId);

  if (markedAt === undefined) return false;

  if (now - markedAt < PLAIN_TTL_MS) return true;

  plain.delete(campaignId);

  return false;
}

export function markPlainCampaign(campaignId: string, now = Date.now()): void {
  plain.set(campaignId, now);
}

export const baseRowsKey = (layer: CampaignLayer, model: string, signature: string) => `${layer.sourceId}|${layer.version}|${model}|${signature}`;

export const baseRowsCache = baseRows;

export const overlayKey = (campaignId: string, layer: CampaignLayer, model: string) => `${campaignId}|${layer.version}|${layer.contentVersion}|${model}`;

export const overlayCache = overlays;

/** The one invalidation point: plain-campaign marks, overlays, and (without an id) the shared base rows. */
export function invalidateCampaignLayer(campaignId?: string) {
  if (!campaignId) {
    plain.clear();
    baseRows.clear();
    overlays.clear();

    return;
  }

  plain.delete(campaignId);
  overlays.deleteWhere((key) => key.startsWith(`${campaignId}|`));
}
