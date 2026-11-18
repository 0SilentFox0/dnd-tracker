import { describe, expect, it } from 'vitest';

import { planPendingMorale } from '@/scripts/db/lib/backfill-pending-morale-plan';

const payload = {
    participantId: 'hero',
    d10Roll: 3,
    moraleResult: {
        shouldSkipTurn: false,
        hasExtraTurn: true,
        moralePositive: true,
        message: '',
    },
};

describe('planPendingMorale', () => {
    it('moves a legacy column payload into ext.morale.pending of the d20 slot', () => {
        const { changes } = planPendingMorale([
            {
                id: 's1',
                version: 4,
                pendingMoraleCheck: payload,
                systemState: null,
            },
        ]);

        expect(changes).toEqual([
            {
                id: 's1',
                version: 4,
                systemState: {
                    key: 'd20',
                    data: { ext: { morale: { pending: payload } } },
                },
            },
        ]);
    });

    it('keeps foreign ext entries and skips rows already migrated or without a payload', () => {
        const migrated = {
            key: 'd20',
            data: { ext: { morale: { pending: null } } },
        };

        const { changes, skipped } = planPendingMorale([
            {
                id: 'a',
                version: 1,
                pendingMoraleCheck: payload,
                systemState: { key: 'd20', data: { ext: { other: 1 } } },
            },
            { id: 'b', version: 1, pendingMoraleCheck: payload, systemState: migrated },
            { id: 'c', version: 1, pendingMoraleCheck: null, systemState: null },
        ]);

        expect(changes).toHaveLength(1);
        expect(changes[0].systemState).toMatchObject({
            data: { ext: { other: 1, morale: { pending: payload } } },
        });
        expect(skipped).toEqual(['b']);
    });

    it('skips a row whose slot belongs to another base', () => {
        const { changes, skipped } = planPendingMorale([
            {
                id: 'w',
                version: 1,
                pendingMoraleCheck: payload,
                systemState: { key: 'wfrp', data: {} },
            },
        ]);

        expect(changes).toEqual([]);
        expect(skipped).toEqual(['w']);
    });
});
