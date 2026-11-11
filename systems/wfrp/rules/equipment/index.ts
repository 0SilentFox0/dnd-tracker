import { armourAp } from "./armour";

import type { RuleSystemEquipment } from "@/lib/utils/rules/systems/types";

export { armourAp, parseWfrpStats } from "./armour";
export * from "./constants";
export { type Encumbrance, encumbrance } from "./encumbrance";
export * from "./qualities";
export { type QualityEffect, qualityEffects, qualityFumbleFrom, qualityToHit } from "./quality-effects";
export type * from "./stats";
export { type WeaponProfile, weaponProfile } from "./weapon-profile";

export const WFRP_EQUIPMENT: RuleSystemEquipment = { armourAp };
