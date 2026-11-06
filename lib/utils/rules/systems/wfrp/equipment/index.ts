import type { RuleSystemEquipment, WeaponProfile } from "../../types";
import { armourAp, parseWfrpStats } from "./armour";
import { QUALITY_REGISTRY } from "./qualities";

export { armourAp, parseWfrpStats } from "./armour";
export * from "./constants";
export * from "./qualities";
export type * from "./stats";

// Weapon profile derivation lands with the weapon task (5f-2)
const weaponProfile = (_stats: unknown): WeaponProfile | null => null;

export const WFRP_EQUIPMENT: RuleSystemEquipment = { armourAp, parseStats: parseWfrpStats, weaponProfile, qualities: QUALITY_REGISTRY };
