import {
    pickHighestPerLine,
    resolveAbilities,
} from '@/lib/utils/abilities/build/resolve';
import type {
    AbilitySourceHook,
    SkillEntry,
} from '@/lib/utils/abilities/build/source-types';
import { skillAbilities } from '@/lib/utils/abilities/read';
import type { Ability } from '@/lib/utils/abilities/schema';
import type { AbilitySource } from '@/types/abilities';

function inheritSchool(abilities: Ability[], school: string | null): Ability[] {
    if (!school) return abilities;

    return abilities.map((a) => ({
        ...a,
        effects: a.effects.map((e) =>
            e.kind === 'damageBonus' &&
            e.filter.kind === 'magic' &&
            !e.filter.school
                ? { ...e, filter: { ...e.filter, school } }
                : e
        ),
    }));
}

function skillSource(entry: SkillEntry): AbilitySource {
    const { row, mainSkillId, level } = entry;

    return {
        type: 'skill',
        id: row.id,
        name: row.name,
        icon: row.icon ?? null,
        ...(mainSkillId &&
            level && {
                line: {
                    mainSkillId,
                    level,
                    ...(entry.levelNode !== undefined && {
                        levelNode: entry.levelNode,
                    }),
                },
            }),
        ...(entry.personal && { personal: true }),
    };
}

const pickSkillEntries = (skills: SkillEntry[]): SkillEntry[] =>
    pickHighestPerLine(
        skills.map((item) => ({ item, source: skillSource(item) }))
    ).map((x) => x.item);

export const SKILLTREES_ABILITY_SOURCES: readonly AbilitySourceHook[] = [
    {
        types: ['skill'],
        at: 'head',
        collect: ({ skills }) =>
            pickSkillEntries(skills).flatMap((entry) =>
                resolveAbilities(
                    skillSource(entry),
                    inheritSchool(
                        skillAbilities(entry.row),
                        entry.row.spellGroupId ?? entry.mainSkillSpellGroupId
                    )
                )
            ),
    },
];
