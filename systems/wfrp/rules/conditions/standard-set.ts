import type { RuleSystemConditionSet } from '@/lib/utils/rules/systems/types';

// WFRP has no 5e-style standard conditions (packs reject them); its own live in WFRP_CONDITIONS.
export const WFRP_CONDITION_SET: RuleSystemConditionSet = {
    apply: (ps) => ({ participants: ps, messages: [], blocked: true }),
    effectInput: () => null,
};
