import type { RuleSystemEquipment } from "../../types";
import { armourAp, parseWfrpStats } from "./armour";
import { QUALITY_REGISTRY } from "./qualities";
import { weaponProfile } from "./weapon-profile";

export { armourAp, parseWfrpStats } from "./armour";
export * from "./constants";
export * from "./qualities";
export { type QualityEffect, qualityEffects, qualityFumbleFrom, qualityToHit } from "./quality-effects";
export type * from "./stats";
export { weaponProfile } from "./weapon-profile";

export const WFRP_EQUIPMENT: RuleSystemEquipment = { armourAp, parseStats: parseWfrpStats, weaponProfile, qualities: QUALITY_REGISTRY };
