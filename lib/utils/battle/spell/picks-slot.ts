import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export const casterPicksSlot = (
    caster: BattleParticipant,
    rules: Pick<Ruleset, 'system'>
): boolean => ruleSystemOf(rules).magic.resource?.picksSlot(caster) ?? false;
