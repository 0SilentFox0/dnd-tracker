import { resolveAbilities } from './resolve';
import type { ArtifactSetRowLike, SkillEntry } from './source-types';
import { SYSTEM_ABILITY_SOURCES } from './system-sources';

import { applyClassScale } from '@/lib/utils/abilities/class-columns';
import {
    artifactAbilities,
    raceAbilities,
    unitAbilities,
} from '@/lib/utils/abilities/read';
import { ownedIn } from '@/lib/utils/abilities/registry/owned';
import type { Ability } from '@/lib/utils/abilities/schema';
import type { ChoiceGroup } from '@/lib/utils/characters/choices/selections';
import { itemStatsFromRow } from '@/lib/utils/items/item-row';
import {
    consumablePoolKey,
    itemPoolKey,
    withItemPool,
} from '@/lib/utils/items/pools';
import type { Composition } from '@/lib/utils/rules/systems/catalog';
import type { ResolvedAbility } from '@/types/abilities';
import type { ResolvedClassEntry } from '@/types/classes';

export type {
    ArtifactSetRowLike,
    SkillEntry,
    SkillRowLike,
} from './source-types';

export interface RaceRowLike {
    id: string;
    name: string;
    abilities?: unknown;
}

export interface ArtifactRowLike {
    id: string;
    name: string;
    slot?: string | null;
    icon?: string | null;
    abilities?: unknown;
    modifiers?: unknown;
}

export interface UnitRowLike {
    id: string;
    name: string;
    abilities?: unknown;
}

function raceResolved(race: RaceRowLike | null): ResolvedAbility[] {
    return race
        ? resolveAbilities(
              { type: 'race', id: race.id, name: race.name },
              raceAbilities(race)
          )
        : [];
}

function classResolved(entries: ResolvedClassEntry[]): ResolvedAbility[] {
    return entries.flatMap(({ class: cls, subclass, level }) => {
        if (!cls) return [];

        const upTo = (features: { level: number; abilities: Ability[] }[]) =>
            features
                .filter((f) => f.level <= level)
                .flatMap((f) => f.abilities);

        // підклас бере колонки, рівень і пули свого класу
        const scale = (abilities: Ability[]) =>
            applyClassScale(abilities, {
                classId: cls.id,
                level,
                columns: cls.columns ?? [],
            });

        return [
            ...resolveAbilities(
                { type: 'class', id: cls.id, name: cls.name, icon: cls.icon },
                scale(upTo(cls.features))
            ),
            ...(subclass
                ? resolveAbilities(
                      {
                          type: 'class',
                          id: subclass.id,
                          name: `${cls.name}: ${subclass.name}`,
                      },
                      scale(upTo(subclass.features))
                  )
                : []),
        ];
    });
}

export function collectCharacterAbilities(
    input: {
        skills: SkillEntry[];
        race: RaceRowLike | null;
        artifacts: ArtifactRowLike[];
        completedSets: ArtifactSetRowLike[];
        classes?: ResolvedClassEntry[];
        consumables?: Array<{ itemId: string; row: ArtifactRowLike }>;
        choiceGroups?: readonly ChoiceGroup[];
    },
    c: Composition
): ResolvedAbility[] {
    const sources = ownedIn(SYSTEM_ABILITY_SOURCES, c).flat();

    const from = (at: 'head' | 'afterArtifacts') =>
        sources.filter((s) => s.at === at).flatMap((s) => s.collect(input));

    const fromArtifacts = input.artifacts.flatMap((a) => {
        const list = artifactAbilities(a);

        return resolveAbilities(
            { type: 'artifact', id: a.id, name: a.name, icon: a.icon ?? null },
            itemStatsFromRow(a)?.charges
                ? withItemPool(list, itemPoolKey(a.id))
                : list
        );
    });

    const fromConsumables = (input.consumables ?? []).flatMap(
        ({ itemId, row }) =>
            resolveAbilities(
                {
                    type: 'artifact',
                    id: `consumable:${itemId}`,
                    name: row.name,
                    icon: row.icon ?? null,
                },
                withItemPool(artifactAbilities(row), consumablePoolKey(itemId))
            )
    );

    const fromChoices = (input.choiceGroups ?? []).flatMap((g) =>
        resolveAbilities(
            g.source,
            g.scale ? applyClassScale(g.abilities, g.scale) : g.abilities
        )
    );

    return [
        ...from('head'),
        ...raceResolved(input.race),
        ...classResolved(input.classes ?? []),
        ...fromChoices,
        ...fromArtifacts,
        ...from('afterArtifacts'),
        ...fromConsumables,
    ];
}

export function collectUnitAbilities(
    unit: UnitRowLike,
    race: RaceRowLike | null
): ResolvedAbility[] {
    return [
        ...resolveAbilities(
            { type: 'unit', id: unit.id, name: unit.name },
            unitAbilities(unit)
        ),
        ...raceResolved(race),
    ];
}
