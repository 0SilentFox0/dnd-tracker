import { defaultAttackAbility } from './default-ability';

import type { AbilityKey } from '@/lib/constants/abilities';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { AttackAbilityResult } from '@/lib/utils/rules/systems/types';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

type SystemRules = Pick<Ruleset, 'system'>;

export const attackAbilityOf = (
    rules: SystemRules,
    p: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[] = [p]
): AttackAbilityResult =>
    ruleSystemOf(rules).combat.attackAbility?.(p, attack, participants) ??
    defaultAttackAbility(p, attack);

export const attackAbilityFor = (
    p: BattleParticipant,
    attack: BattleAttack,
    rules: SystemRules
): AbilityKey => attackAbilityOf(rules, p, attack).key;

export const attackRollModifier = (
    p: BattleParticipant,
    attack: BattleAttack,
    rules: SystemRules
): number => attackAbilityOf(rules, p, attack).roll;

export const attackDamageModifier = (
    p: BattleParticipant,
    attack: BattleAttack,
    rules: SystemRules,
    participants: BattleParticipant[] = [p]
): number => attackAbilityOf(rules, p, attack, participants).damage;
