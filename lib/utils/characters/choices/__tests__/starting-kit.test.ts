import { describe, expect, it } from 'vitest';

import { refs, sorcerer } from './fixtures';

import { ChoiceSchema } from '@/lib/schemas/choices';
import { pickedKit } from '@/lib/utils/characters/choices/kit';
import { pendingCount } from '@/lib/utils/characters/choices/pending';
import { validatePicks } from '@/lib/utils/characters/choices/validate';
import { visitPicks } from '@/lib/utils/characters/choices/walk';
import { wizardSteps } from '@/lib/utils/characters/choices/wizard';
import type { Choice } from '@/types/choices';
import type { GameClassData } from '@/types/classes';

const kitChoice: Choice = {
    id: 'starting-equipment',
    label: 'Starting Equipment',
    level: 1,
    count: 1,
    kind: 'option',
    atCreation: true,
    options: [
        {
            id: 'a',
            name: 'Package A',
            abilities: [],
            kit: { items: [{ artifact: 'srd_dagger', quantity: 2 }], gp: 5 },
        },
        {
            id: 'b',
            name: 'Package B',
            abilities: [],
            kit: { items: [], gp: 55 },
        },
    ],
};

const withKit: GameClassData = {
    ...sorcerer,
    id: 'cls-kit',
    features: [
        { ...sorcerer.features[0], choices: [kitChoice] },
        ...sorcerer.features.slice(1),
    ],
};

const state = (choices?: Record<string, { id: string }[]>) => ({
    raceChoices: {},
    feats: [],
    classes: [{ classId: withKit.id, level: 1, ...(choices && { choices }) }],
});

const krefs = {
    ...refs,
    classesById: { ...refs.classesById, [withKit.id]: withKit },
};

describe('atCreation choices', () => {
    it('are never pending and never a wizard step', () => {
        const visits = visitPicks(state(), krefs, {
            level: 1,
            classMode: true,
        });

        expect(visits.find((v) => v.choice.id === kitChoice.id)?.open).toBe(
            false
        );
        expect(pendingCount(visits, krefs)).toBe(0);
        expect(
            wizardSteps(state(), krefs, { level: 1, classMode: true }).map(
                (s) => s.choice?.id
            )
        ).not.toContain(kitChoice.id);
    });

    it('produce no validation issues', () => {
        const ctxOwner = {
            owner: 'class' as const,
            level: 1,
            totalLevel: 1,
        };

        expect(
            validatePicks(
                [kitChoice],
                { [kitChoice.id]: [{ id: 'a' }] },
                {
                    ...ctxOwner,
                    featsById: {},
                    spellsById: {},
                    proficient: new Set(),
                    scores: {
                        strength: 10,
                        dexterity: 10,
                        constitution: 10,
                        intelligence: 10,
                        wisdom: 10,
                        charisma: 10,
                    },
                    featCounts: new Map(),
                },
                'classes.x'
            )
        ).toEqual([]);
    });

    it('schema: kit parses; atCreation needs an option list', () => {
        expect(ChoiceSchema.safeParse(kitChoice).success).toBe(true);
        expect(
            ChoiceSchema.safeParse({
                ...kitChoice,
                kind: 'skill',
                options: undefined,
            }).success
        ).toBe(false);
    });
});

describe('pickedKit', () => {
    const byId = { [withKit.id]: withKit };

    it('null without a pick', () => {
        expect(pickedKit([{ classId: withKit.id, level: 1 }], byId)).toBeNull();
    });

    it('returns the kit of the first class pick', () => {
        expect(
            pickedKit(
                [
                    {
                        classId: withKit.id,
                        level: 1,
                        choices: { [kitChoice.id]: [{ id: 'b' }] },
                    },
                ],
                byId
            )
        ).toEqual({ items: [], gp: 55 });
    });

    it('ignores the pick of the second class', () => {
        expect(
            pickedKit(
                [
                    { classId: sorcerer.id, level: 1 },
                    {
                        classId: withKit.id,
                        level: 1,
                        choices: { [kitChoice.id]: [{ id: 'a' }] },
                    },
                ],
                { ...byId, [sorcerer.id]: sorcerer }
            )
        ).toBeNull();
    });
});
