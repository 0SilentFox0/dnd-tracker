import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import {
    historyHasLegacy,
    shapeOf,
    upgradeHistory,
    upgradeStored,
} from '@/scripts/db/lib/battle-state-shapes';

const BASE = 'base';

const stored = (
    snapshot: Record<string, unknown>,
    state: Record<string, unknown>
) => ({ snapshot, state, snapshotHash: hashJson(snapshot) });

describe('upgradeStored', () => {
    it('builds the base slot from flat fields and marks dying when deathSaves exist', () => {
        const saves = { successes: 1, failures: 0, stable: false };

        const result = upgradeStored(
            stored(
                {
                    basicInfo: { id: 'p1' },
                    battleData: { deathSaves: saves, inspiration: true },
                },
                { activeEffects: [] }
            ),
            BASE
        );

        expect(result.changed).toBe(true);
        expect(result.state).toEqual({
            activeEffects: [],
            dying: true,
            system: {
                key: BASE,
                data: { deathSaves: saves, inspiration: true },
            },
        });
        expect(result.snapshot).toEqual({
            basicInfo: { id: 'p1' },
            battleData: {},
        });
        expect(result.snapshotHash).toBe(hashJson(result.snapshot));
        expect(
            shapeOf({ snapshot: result.snapshot, state: result.state })
        ).toBe('slot');
    });

    it('moves state-bound fields of a legacy row without dying', () => {
        const result = upgradeStored(
            stored(
                { battleData: { fortune: 2, sin: 1 } },
                { psychologyTested: { fear: 1 } }
            ),
            BASE
        );

        expect(result.state).toEqual({
            system: {
                key: BASE,
                data: { fortune: 2, sin: 1, psychologyTested: { fear: 1 } },
            },
        });
    });

    it('mixed: drops base fields, keeps the slot and dying, lifts a flat retaliationsUsed of 0', () => {
        const result = upgradeStored(
            stored(
                { battleData: { fortune: 9 } },
                {
                    dying: false,
                    retaliationsUsed: 0,
                    psychologyTested: { x: 1 },
                    system: { key: BASE, data: { fortune: 1 } },
                }
            ),
            BASE
        );

        expect(result.state).toEqual({
            dying: false,
            system: {
                key: BASE,
                data: { fortune: 1, ext: { retaliation: { used: 0 } } },
            },
        });
        expect(result.snapshot).toEqual({ battleData: {} });
    });

    it('keeps an existing ext.retaliation and only drops the flat counter', () => {
        const result = upgradeStored(
            stored(
                { battleData: {} },
                {
                    retaliationsUsed: 3,
                    system: {
                        key: BASE,
                        data: { ext: { retaliation: { used: 1 } } },
                    },
                }
            ),
            BASE
        );

        expect(result.state).toEqual({
            system: { key: BASE, data: { ext: { retaliation: { used: 1 } } } },
        });
    });

    it('creates a slot for a counter-only row', () => {
        const result = upgradeStored(
            stored({ battleData: {} }, { retaliationsUsed: 2 }),
            BASE
        );

        expect(result.state).toEqual({
            system: { key: BASE, data: { ext: { retaliation: { used: 2 } } } },
        });
    });

    it('leaves a slot-only row and a plain row untouched', () => {
        const slotOnly = stored(
            { battleData: {} },
            { system: { key: BASE, data: { fortune: 1 } } }
        );

        const plain = stored({ battleData: {} }, { activeEffects: [] });

        for (const row of [slotOnly, plain]) {
            const result = upgradeStored(row, BASE);

            expect(result.changed).toBe(false);
            expect(result.state).toBe(row.state);
            expect(result.snapshotHash).toBe(row.snapshotHash);
        }
    });

    it('does not touch a row whose hash mismatches but has no legacy fields', () => {
        const row = {
            ...stored({ battleData: {} }, {}),
            snapshotHash: 'stale',
        };

        expect(upgradeStored(row, BASE)).toMatchObject({
            changed: false,
            snapshotHash: 'stale',
        });
    });

    it('reports a slot of another key as unmapped and keeps the row', () => {
        const row = stored(
            { battleData: { fortune: 1 } },
            { system: { key: 'other', data: {} } }
        );

        const result = upgradeStored(row, BASE);

        expect(result.changed).toBe(false);
        expect(result.unmapped).toEqual(['slot.key other']);
    });

    it('is idempotent', () => {
        const once = upgradeStored(
            stored(
                { battleData: { fortune: 2 } },
                { retaliationsUsed: 1, psychologyTested: { a: 1 } }
            ),
            BASE
        );

        const twice = upgradeStored(once, BASE);

        expect(twice.changed).toBe(false);
    });

});

describe('upgradeHistory', () => {
    const history = () => ({
        participants: [
            {
                columns: { id: 'p1' },
                state: { psychologyTested: { a: 1 }, retaliationsUsed: 0 },
            },
            { columns: { id: 'p2' }, state: {} },
        ],
        changedSnapshots: {
            p1: { battleData: { fortune: 2, deathSaves: { successes: 0 } } },
        },
        removed: [
            {
                snapshot: { battleData: { sin: 1 } },
                state: {},
                snapshotHash: 'x',
            },
        ],
    });

    it('moves participant state and changedSnapshots into the slot, and rewrites removed with a hash', () => {
        expect(historyHasLegacy(history())).toBe(true);

        const result = upgradeHistory(history(), BASE);

        expect(result.changed).toBe(true);

        const next = result.state as ReturnType<typeof history>;

        expect(next.participants[0].state).toEqual({
            dying: true,
            system: {
                key: BASE,
                data: {
                    fortune: 2,
                    deathSaves: { successes: 0 },
                    psychologyTested: { a: 1 },
                    ext: { retaliation: { used: 0 } },
                },
            },
        });
        expect(next.participants[1]).toEqual(history().participants[1]);
        expect(next.changedSnapshots.p1).toEqual({ battleData: {} });
        expect(next.removed[0]).toMatchObject({
            snapshot: { battleData: {} },
            state: { system: { key: BASE, data: { sin: 1 } } },
            snapshotHash: hashJson({ battleData: {} }),
        });
        expect(historyHasLegacy(next)).toBe(false);
    });

    it('does not invent changedSnapshots and is idempotent', () => {
        const state = {
            participants: [
                { columns: { id: 'p1' }, state: { psychologyTested: {} } },
            ],
        };

        const once = upgradeHistory(state, BASE);

        expect('changedSnapshots' in (once.state as object)).toBe(false);
        expect(upgradeHistory(once.state, BASE).changed).toBe(false);
    });

    it('tolerates a non-object state', () => {
        expect(upgradeHistory(null, BASE).changed).toBe(false);
        expect(historyHasLegacy('x')).toBe(false);
    });
});
