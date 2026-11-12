import {
    getAbilityModifier,
    getSpellAttackBonus,
    getSpellSaveDC,
} from '@/lib/utils/common/calculations';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { SpellcastingInput } from '@/lib/utils/rules/systems/types';
import { proficiencyForLevel } from '@/systems/d20/rules/proficiency/level';
import type { AbilityKey } from '@/types/characters';

export function spellcastingDerived(
    level: number,
    ability: string | null | undefined,
    scores: Record<AbilityKey, number>,
    formulas: Ruleset['formulas'] = DEFAULT_RULES.formulas
): { saveDC: number; attackBonus: number } | null {
    if (!ability || !(ability in scores)) return null;

    const prof = proficiencyForLevel(level, formulas);

    const mod = getAbilityModifier(scores[ability as AbilityKey]);

    return {
        saveDC: getSpellSaveDC(prof, mod, formulas.saveDcBase),
        attackBonus: getSpellAttackBonus(prof, mod),
    };
}

export const d20Spellcasting = ({
    level,
    ability,
    scores,
    rules,
}: SpellcastingInput) =>
    spellcastingDerived(level, ability, scores, rules.formulas);
