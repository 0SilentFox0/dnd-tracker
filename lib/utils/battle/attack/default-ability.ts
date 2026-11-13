import {
    attackAbilityKey,
    getAttackAbilityModifier,
} from '@/lib/utils/common/calculations';
import type { AttackAbilityResult } from '@/lib/utils/rules/systems/types';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export function defaultAttackAbility(
    p: BattleParticipant,
    attack: BattleAttack
): AttackAbilityResult {
    const mod = getAttackAbilityModifier(p.abilities, attack.type);

    return {
        key: attackAbilityKey(p.abilities, attack.type),
        roll: mod,
        damage: mod,
    };
}
