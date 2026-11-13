import { isFiveE } from '../damage-model';

import type { AbilityKey } from '@/lib/constants/abilities';
import { AttackType } from '@/lib/constants/battle';
import { findFlags } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import { defaultAttackAbility } from '@/lib/utils/battle/attack/default-ability';
import { hasTrait } from '@/lib/utils/battle/common/weapon-trait';
import { getAbilityModifier } from '@/lib/utils/common/calculations';
import type {
    AttackAbilityResult,
    ReachRules,
} from '@/lib/utils/rules/systems/types';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const modOf = (p: BattleParticipant, key: AbilityKey) =>
    getAbilityModifier(p.abilities[key] ?? 10);

/** 5e: finesse picks the better of STR/DEX, ranged (not a thrown melee) uses DEX, melee STR; an off-hand damage modifier is capped at 0 without twoWeaponFighting. */
export function d20AttackAbility(
    p: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[]
): AttackAbilityResult {
    if (!isFiveE(p)) return defaultAttackAbility(p, attack);

    const key: AbilityKey = hasTrait(attack, 'finesse')
        ? modOf(p, 'dexterity') > modOf(p, 'strength')
            ? 'dexterity'
            : 'strength'
        : attack.type === AttackType.RANGED
          ? 'dexterity'
          : 'strength';

    const roll = modOf(p, key);

    const capped =
        attack.hand === 'off' &&
        roll > 0 &&
        findFlags(
            withSelf(participants, p),
            p.basicInfo.id,
            'twoWeaponFighting'
        ).length === 0;

    return { key, roll, damage: capped ? 0 : roll };
}

export const D20_REACH: ReachRules = {
    meleeCells: (p, attack) =>
        isFiveE(p) && hasTrait(attack, 'reach') ? 2 : 1,
    rangedPenalties: isFiveE,
};
