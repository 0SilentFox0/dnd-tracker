import { armourAp, parseWfrpStats } from "./armour";
import { encumbrance } from "./encumbrance";
import { QUALITY_REGISTRY } from "./qualities";
import { weaponProfile } from "./weapon-profile";

import type { RuleSystemEquipment } from "@/lib/utils/rules/systems/types";

export { armourAp, parseWfrpStats } from "./armour";
export * from "./constants";
export { type Encumbrance, encumbrance } from "./encumbrance";
export * from "./qualities";
export { type QualityEffect, qualityEffects, qualityFumbleFrom, qualityToHit } from "./quality-effects";
export type * from "./stats";
export { weaponProfile } from "./weapon-profile";

export const WFRP_EQUIPMENT: RuleSystemEquipment = { armourAp, parseStats: parseWfrpStats, weaponProfile, qualities: QUALITY_REGISTRY, encumbrance };
