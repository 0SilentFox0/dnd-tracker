import { describe, expect, it } from 'vitest';

import { planD20ExtState } from '@/scripts/db/lib/backfill-d20-ext-state-plan';

const SAVES = { successes: 1, failures: 0, stable: false };

describe('planD20ExtState', () => {
    it('moves the flat d20 fields into ext and keeps other ext entries', () => {
        const { changes } = planD20ExtState([
            {
                id: 'a',
                state: {
                    system: {
                        key: 'd20',
                        data: {
                            deathSaves: SAVES,
                            inspiration: true,
                            ext: { retaliation: { used: 1 } },
                        },
                    },
                },
            },
        ]);

        expect(changes).toHaveLength(1);
        expect(changes[0].state).toEqual({
            system: {
                key: 'd20',
                data: {
                    ext: {
                        retaliation: { used: 1 },
                        deathsaves: SAVES,
                        inspiration: { available: true },
                    },
                },
            },
        });
    });

    it('is idempotent and leaves foreign slots and slotless rows alone', () => {
        const migrated = {
            system: {
                key: 'd20',
                data: { ext: { deathsaves: SAVES } },
            },
        };

        const { changes, unchanged } = planD20ExtState([
            { id: 'a', state: migrated },
            { id: 'b', state: { system: { key: 'wfrp', data: { sin: 1 } } } },
            { id: 'c', state: {} },
        ]);

        expect(changes).toEqual([]);
        expect(unchanged).toBe(3);
    });
});
