import type { RuleSystemAdvancement } from "../../types";
import { advanceCost } from "./cost";
import { planPurchase } from "./plan";
import { availableXp, talentGroups } from "./talent-groups";
import { planUndo } from "./undo";

export { advanceCost } from "./cost";
export { DEFAULT_ADVANCEMENT_RULES } from "./defaults";
export { planPurchase, type PurchaseError, type PurchaseInput, type PurchaseRequest, type PurchaseResult, type PurchaseTalent } from "./plan";
export type { AdvancementRules, AdvancementTrack } from "./rules";
export { availableXp, talentGroups } from "./talent-groups";
export { planUndo, type UndoResult } from "./undo";

export const WFRP_ADVANCEMENT: RuleSystemAdvancement = { cost: advanceCost, planPurchase, planUndo, availableXp, talentGroups };
