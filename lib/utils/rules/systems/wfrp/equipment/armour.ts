import { type HitLocation, LOCATIONS } from "../combat/constants";
import { AP_CAP } from "./constants";
import { readStats } from "./guard";
import { hasQuality, qualityValue } from "./qualities";
import type { WfrpItemStats } from "./stats";

const ARMOUR_SLOTS = new Set(["armor", "helmet", "boots"]);

const SHIELD_SLOTS = new Set(["shield", "weapon", "range_weapon"]);

const SHIELD_LOCATIONS: readonly HitLocation[] = ["head", "arm", "body"];

export type EquippedStatsRow = { slot: string; systemStats: unknown };

export const parseWfrpStats = (raw: unknown): WfrpItemStats | null => readStats(raw);

export function armourAp(equipped: EquippedStatsRow[]): { ap: Record<HitLocation, number>; flexible: boolean } {
  const ap = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<HitLocation, number>;

  let layers = 0;

  let allFlexible = true;

  for (const row of equipped) {
    const stats = parseWfrpStats(row.systemStats);

    if (!stats) continue;

    if (stats.type === "armour" && ARMOUR_SLOTS.has(row.slot) && LOCATIONS.some((l) => stats.locations[l] > 0)) {
      for (const l of LOCATIONS) ap[l] += stats.locations[l];
      layers += 1;

      if (!hasQuality(stats.qualities, "flexible")) allFlexible = false;
    }

    if (SHIELD_SLOTS.has(row.slot) && stats.type !== "armour") {
      const x = qualityValue(stats.qualities, "shield");

      if (x) for (const l of SHIELD_LOCATIONS) ap[l] += x;
    }
  }

  for (const l of LOCATIONS) ap[l] = Math.min(ap[l], AP_CAP);

  return { ap, flexible: layers > 0 && allFlexible };
}
