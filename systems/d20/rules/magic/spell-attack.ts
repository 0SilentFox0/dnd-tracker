import { spellcastingModifier, weaponModifier } from './ability-modifier';

import type { BattleParticipant } from '@/types/battle';

export function d20SpellAttackBonus(
    caster: BattleParticipant,
    weapon: boolean
): number {
    const { proficiencyBonus } = caster.abilities;

    if (weapon && !caster.spellcasting.spellcastingAbility)
        return proficiencyBonus + weaponModifier(caster).mod;

    return (
        caster.spellcasting.spellAttackBonus ??
        proficiencyBonus + spellcastingModifier(caster).mod
    );
}
