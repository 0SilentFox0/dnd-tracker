import type { WeaponProfile } from "../../types";
import { readStats } from "./guard";
import type { WfrpWeaponStats } from "./stats";

// Matches wfrp `distance` (2 yd per cell); the registry cannot be imported from here without a cycle
export const WFRP_CELL_FEET = 6;

// verify against 5e book
const REACH_FEET: Record<NonNullable<WfrpWeaponStats["reach"]>, number> = { personal: 3, "very-short": 3, short: 6, average: 6, long: 12, "very-long": 18, massive: 24 };

const cellsOf = (feet: number) => Math.max(1, Math.ceil(feet / WFRP_CELL_FEET));

export function weaponProfile(stats: unknown): WeaponProfile | null {
  const s = readStats(stats);

  if (s?.type !== "weapon") return null;

  const common = { damageFlat: s.damage.flat, addSb: s.damage.addSb, qualities: s.qualities, flaws: s.flaws, twoHanded: s.twoHanded, ...(s.ammoCapacity !== undefined && { ammoCapacity: s.ammoCapacity }) };

  if (s.range !== undefined) return { range: "ranged", cells: cellsOf(s.range), rangeFt: s.range, ...common };

  return { range: "melee", cells: cellsOf(REACH_FEET[s.reach ?? "average"]), ...common };
}
