import type { AbilityKey } from '@/lib/constants/abilities';
import { exhaustionLevel } from '@/lib/utils/battle/conditions/query';
import { getSpellSaveDC } from '@/lib/utils/common/calculations';
import type { BattleParticipant } from '@/types/battle';

/** 2024 exhaustion lowers d20 tests and spell save DCs by 2 per level; the variant rides on the effect. */
const exhaustionDcPenalty = (caster: BattleParticipant): number =>
    caster.battleData.activeEffects.some(
        (e) => e.exhaustionVariant === '2024'
    )
        ? 2 * exhaustionLevel(caster)
        : 0;

export function d20SpellSaveDc(
    caster: BattleParticipant,
    ability: AbilityKey | undefined,
    base: number
): number {
    const casting = ability ?? caster.spellcasting?.spellcastingAbility;

    const computed = getSpellSaveDC(
        caster.abilities.proficiencyBonus,
        casting ? caster.abilities.modifiers[casting] : 0,
        base
    );

    const dc = ability ? computed : (caster.spellcasting.spellSaveDC ?? computed);

    return dc - exhaustionDcPenalty(caster);
}
