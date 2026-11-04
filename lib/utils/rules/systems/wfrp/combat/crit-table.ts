import type { HitLocation } from "./constants";

import { rollDie } from "@/lib/utils/common/dice";
import type { Rng } from "@/lib/utils/common/rng";

export interface CritResult {
  id: string;
  textKey: string;
  bonusDamage: number;
  markerKey?: string;
}

interface CritRow {
  max: number;
  bonusDamage: number;
  markerKey?: string;
}

export const CRIT_TABLE: Record<HitLocation, CritRow[]> = {
  head: [
    { max: 20, bonusDamage: 1 },
    { max: 40, bonusDamage: 2, markerKey: "bleeding" },
    { max: 60, bonusDamage: 2, markerKey: "stunned" },
    { max: 80, bonusDamage: 3, markerKey: "stunned" },
    { max: 100, bonusDamage: 5, markerKey: "unconscious" },
  ],
  arm: [
    { max: 20, bonusDamage: 1 },
    { max: 40, bonusDamage: 2, markerKey: "bleeding" },
    { max: 60, bonusDamage: 2, markerKey: "disarmed" },
    { max: 80, bonusDamage: 3, markerKey: "bleeding" },
    { max: 100, bonusDamage: 4, markerKey: "disarmed" },
  ],
  body: [
    { max: 20, bonusDamage: 1 },
    { max: 40, bonusDamage: 2, markerKey: "winded" },
    { max: 60, bonusDamage: 2, markerKey: "bleeding" },
    { max: 80, bonusDamage: 3, markerKey: "bleeding" },
    { max: 100, bonusDamage: 5, markerKey: "stunned" },
  ],
  leg: [
    { max: 20, bonusDamage: 1 },
    { max: 40, bonusDamage: 2, markerKey: "bleeding" },
    { max: 60, bonusDamage: 2, markerKey: "prone" },
    { max: 80, bonusDamage: 3, markerKey: "prone" },
    { max: 100, bonusDamage: 4, markerKey: "crippled" },
  ],
};

export function rollCrit(location: HitLocation, rng: Rng, presetRoll?: number): CritResult {
  const roll = presetRoll ?? rollDie(100, rng);

  const rows = CRIT_TABLE[location];

  const index = rows.findIndex((row) => roll <= row.max);

  const { bonusDamage, markerKey } = rows[index];

  return { id: `${location}.${index + 1}`, textKey: `battleLog.wfrp.crit.${location}.${index + 1}`, bonusDamage, ...(markerKey ? { markerKey } : {}) };
}
