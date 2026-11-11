import { readCharacteristics } from "../characteristics/keys";
import { talentGroups } from "./talent-groups";

import type { RuleSystemAdvancement } from "@/lib/utils/rules/systems/types";

export { type CareerAdvanceResult, type CareerCtx, type CareerPrice, careerPrice, type CareerTierDef, inCareer, planCareerAdvance, planCareerSet, tickKey } from "./career";
export { advanceCost, talentCost } from "./cost";
export { DEFAULT_ADVANCEMENT_RULES } from "./defaults";
export { planPurchase, type PurchaseError, type PurchaseInput, type PurchaseRequest, type PurchaseResult, type PurchaseTalent } from "./plan";
export type { AdvancementRules, AdvancementTrack } from "./rules";
export { availableXp, talentGroups } from "./talent-groups";
export { planUndo, type UndoResult } from "./undo";

export const WFRP_ADVANCEMENT: RuleSystemAdvancement = { talentsOf: (row) => readCharacteristics(row).talents, talentGroups };
