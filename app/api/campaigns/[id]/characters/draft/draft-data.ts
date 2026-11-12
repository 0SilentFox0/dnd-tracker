import type { Prisma } from '@prisma/client';

import type { DraftData } from './draft-schema';

import { mergeDraftGoals } from '@/lib/server/characters/draft-goals';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

export const draftFields = (
    data: DraftData,
    rules: Ruleset,
    storedGoals?: unknown
) => ({
    name: data.name,
    race: data.race,
    class: 'class' in data ? data.class : '',
    archetype: statColumnsOf(ruleSystemOf(rules)).has('archetype')
        ? 'archetype' in data
            ? data.archetype
            : null
        : undefined,
    alignment: data.alignment ?? null,
    background: data.background ?? null,
    strength: data.strength,
    dexterity: data.dexterity,
    constitution: data.constitution,
    intelligence: data.intelligence,
    wisdom: data.wisdom,
    charisma: data.charisma,
    primaryAbility: data.primaryAbility ?? null,
    goals: mergeDraftGoals(
        storedGoals,
        data.goals
    ) as unknown as Prisma.InputJsonValue,
});
