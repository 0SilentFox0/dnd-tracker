import { abilityLines, armorTotal, checkBonus } from './lines';

import { ABILITY_KEYS, type AbilityKey } from '@/lib/constants/abilities';
import { DND_SKILL_META, DND_SKILLS } from '@/lib/constants/skills';
import { hitDiceLabel } from '@/lib/utils/characters/classes';
import { abilityLabel } from '@/lib/utils/characters/sheet/line-parts';
import { getAbilityModifier } from '@/lib/utils/common/calculations';
import type { SheetBlock } from '@/lib/utils/rules/systems/types';

const flags = (raw: unknown) =>
    raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, boolean>)
        : {};

export const d20SheetBlock: SheetBlock = ({
    participant: p,
    character: c,
    classes,
    choices,
}) => {
    const prof = p.abilities.proficiencyBonus;

    const scores = Object.fromEntries(
        ABILITY_KEYS.map((k) => [k, p.abilities[k]])
    ) as Record<AbilityKey, number>;

    const primary = p.abilities.primaryAbility ?? null;

    const manualSaves = flags(c.savingThrows);

    const isSaveProficient = (key: AbilityKey) =>
        !!manualSaves[key] || !!p.abilities.saveProficiencies?.includes(key);

    const skillFlags = flags(c.skills);

    const skills = DND_SKILLS.map((key) => {
        const meta = DND_SKILL_META[key];

        const proficient = !!skillFlags[key] || !!choices?.skills.has(key);

        const expertise = proficient && !!choices?.expertise.has(key);

        return {
            key,
            label: `gameTerms.dndSkills.${key}`,
            ability: meta.ability,
            proficient,
            bonus: checkBonus(
                scores[meta.ability],
                proficient,
                expertise ? prof * 2 : prof
            ),
            ...(expertise && { expertise: true as const }),
        };
    });

    const passive = (key: string) =>
        10 + (skills.find((s) => s.key === key)?.bonus ?? 0);

    return {
        abilities: ABILITY_KEYS.map((key) => ({
            key,
            score: scores[key],
            mod: getAbilityModifier(scores[key]),
            isPrimary: primary === key,
            lines: abilityLines(p, key, c[key]),
        })),
        proficiency: prof,
        armorClass: armorTotal(p),
        saves: ABILITY_KEYS.map((key) => ({
            key,
            label: abilityLabel(key),
            ability: key,
            proficient: isSaveProficient(key),
            bonus: checkBonus(scores[key], isSaveProficient(key), prof),
        })),
        skills,
        passives: {
            perception: passive('perception'),
            investigation: passive('investigation'),
            insight: passive('insight'),
        },
        hitDice: classes ? hitDiceLabel(classes) : null,
    };
};
