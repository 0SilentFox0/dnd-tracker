import { planCareerAdvance, planCareerSet } from "./career";
import { advanceCost } from "./cost";
import { planPurchase } from "./plan";
import { availableXp, talentGroups } from "./talent-groups";
import { planUndo } from "./undo";

import type { RuleSystemAdvancement } from "@/lib/utils/rules/systems/types";

export { type CareerAdvanceResult, type CareerCtx, type CareerPrice, careerPrice, type CareerTierDef, inCareer, planCareerAdvance, planCareerSet, tickKey } from "./career";
export { advanceCost, talentCost } from "./cost";
export { DEFAULT_ADVANCEMENT_RULES } from "./defaults";
export { planPurchase, type PurchaseError, type PurchaseInput, type PurchaseRequest, type PurchaseResult, type PurchaseTalent } from "./plan";
export type { AdvancementRules, AdvancementTrack } from "./rules";
export { availableXp, talentGroups } from "./talent-groups";
export { planUndo, type UndoResult } from "./undo";

export const WFRP_ADVANCEMENT: RuleSystemAdvancement = { cost: advanceCost, planPurchase, planUndo, planCareerSet, planCareerAdvance, availableXp, talentGroups };
