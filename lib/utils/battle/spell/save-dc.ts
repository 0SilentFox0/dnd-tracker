import type { AbilityKey } from '@/lib/constants/abilities';
import { SECTION_DEFAULTS } from '@/lib/utils/rules/defaults';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export const saveDcBaseOf = (rules: Ruleset): number =>
    ruleSystemOf(rules).magic.saveDcBase?.(rules) ??
    SECTION_DEFAULTS.formulas.saveDcBase;

export const spellSaveDc = (
    rules: Ruleset,
    caster: BattleParticipant,
    ability?: AbilityKey
): number | undefined =>
    ruleSystemOf(rules).magic.saveDc(caster, ability, saveDcBaseOf(rules));
