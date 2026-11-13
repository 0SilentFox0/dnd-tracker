import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyBattleResult, applyCharacterResources } from '../battle';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { PersistPart, StoredPart } from '@/lib/utils/rules/systems/types';

const fake = vi.hoisted(() => ({
    fromStored: [] as StoredPart[],
    persist: [] as PersistPart[],
}));

vi.mock('@/lib/utils/rules/systems', () => ({
    ruleSystemOf: () => ({
        participant: {
            fromStored: fake.fromStored,
            persist: fake.persist,
        },
    }),
}));

const rules = DEFAULT_RULES;

beforeEach(() => {
    fake.fromStored.length = 0;
    fake.persist.length = 0;
});

describe('participant.fromStored', () => {
    it('folds the parts in order and hands each the stored state and rules', () => {
        const seen: unknown[] = [];

        fake.fromStored.push(
            (p, ctx) => {
                seen.push(ctx.stored, ctx.rules);

                return {
                    ...p,
                    battleData: { ...p.battleData, attacksLeft: 1 },
                };
            },
            (p) => ({
                ...p,
                battleData: {
                    ...p.battleData,
                    attacksLeft: (p.battleData.attacksLeft ?? 0) + 10,
                },
            })
        );

        const stored = { resources: null, inspiration: null };

        const out = applyCharacterResources(
            createMockParticipant(),
            stored,
            rules
        );

        expect(out.battleData.attacksLeft).toBe(11);
        expect(seen).toEqual([stored, rules]);
    });

    it('without parts the participant is unchanged', () => {
        const p = createMockParticipant();

        expect(
            applyCharacterResources(
                p,
                { resources: null, inspiration: null },
                rules
            )
        ).toEqual(p);
    });
});

describe('participant.persist', () => {
    it('folds the parts in order, passing the accumulated resources on', () => {
        fake.persist.push(
            (_ctx, acc) => ({ resources: { ...acc.resources, fortune: 1 } }),
            (_ctx, acc) => ({
                resources: {
                    ...acc.resources,
                    sin: (acc.resources.fortune ?? 0) + 4,
                },
            })
        );

        const out = applyBattleResult({}, createMockParticipant(), rules);

        expect(out.fortune).toBe(1);
        expect(out.sin).toBe(5);
    });

    it('a part sees the participant and rules', () => {
        const p = createMockParticipant();

        let got: unknown;

        fake.persist.push((ctx, acc) => {
            got = ctx;

            return acc;
        });

        applyBattleResult({}, p, rules);

        expect(got).toEqual({ participant: p, rules });
    });
});
