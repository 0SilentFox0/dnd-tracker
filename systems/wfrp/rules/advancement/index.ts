import { readCharacteristics } from '../characteristics/keys';
import { talentGroups } from './talent-groups';

import type { RuleSystemAdvancement } from '@/lib/utils/rules/systems/types';

export { advancementFor, CANON_TALENT_COST } from './canon';
export {
    CAREER_ADVANCE_XP,
    type CareerAdvanceResult,
    careerChangeCost,
    type CareerCharge,
    type CareerCtx,
    type CareerPrice,
    careerPrice,
    type CareerTierDef,
    inCareer,
    planCareerAdvance,
    planCareerRevert,
    planCareerSet,
    planTrappingTick,
    tickKey,
} from './career';
export { advanceCost, advanceTarget, talentCost } from './cost';
export { DEFAULT_ADVANCEMENT_RULES } from './defaults';
export {
    planPurchase,
    type PurchaseError,
    type PurchaseInput,
    type PurchaseRequest,
    type PurchaseResult,
    type PurchaseTalent,
} from './plan';
export type { AdvancementRules, AdvancementTrack } from './rules';
export { availableXp, talentGroups } from './talent-groups';
export { planUndo, type UndoResult } from './undo';

export const WFRP_ADVANCEMENT: RuleSystemAdvancement = {
    talentsOf: (row) => readCharacteristics(row).talents,
    talentGroups,
};
