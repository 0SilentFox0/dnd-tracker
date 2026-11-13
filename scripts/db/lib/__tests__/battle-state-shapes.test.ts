import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import {
    downgradeHistory,
    downgradeParticipant,
    EXT_TO_LEGACY,
    fieldsOf,
    hashMismatch,
    type ParticipantRow,
    shapeOf,
} from '@/scripts/db/lib/battle-state-shapes';
import {
    countLiterals,
    literalTokens,
    ROOT,
} from '@/scripts/shared/system-ratchet';

const row = (
    snapshot: Record<string, unknown>,
    state: Record<string, unknown>
): ParticipantRow => ({
    id: 'p1',
    battleId: 'b1',
    snapshot,
    state,
    snapshotHash: hashJson(snapshot),
});

const legacyRow = () =>
    row(
        {
            basicInfo: { id: 'p1' },
            battleData: { fortune: 2, channelledSl: 3 },
        },
        { activeEffects: [], psychologyTested: { fear: 1 } }
    );

const slotRow = () =>
    row(
        { basicInfo: { id: 'p1' }, battleData: {} },
        {
            activeEffects: [],
            system: {
                key: 'sys',
                data: { fortune: 1, conditionTests: ['x'] },
            },
        }
    );

describe('shapeOf', () => {
    it('none without any field', () =>
        expect(shapeOf(row({ battleData: {} }, {}))).toBe('none'));

    it('legacy for flat fields in snapshot or state', () => {
        expect(shapeOf(legacyRow())).toBe('legacy');
        expect(shapeOf(row({ battleData: {} }, { psychologyTested: {} }))).toBe(
            'legacy'
        );
    });

    it('slot for a slot only, even an empty one', () => {
        expect(shapeOf(slotRow())).toBe('slot');
        expect(
            shapeOf(
                row({ battleData: {} }, { system: { key: 'sys', data: {} } })
            )
        ).toBe('slot');
    });

    it('mixed for both', () =>
        expect(
            shapeOf(
                row(
                    { battleData: { fortune: 1 } },
                    { system: { key: 'sys', data: { fortune: 1 } } }
                )
            )
        ).toBe('mixed'));

    it('ignores a malformed slot', () =>
        expect(shapeOf(row({ battleData: {} }, { system: { data: {} } }))).toBe(
            'none'
        ));
});

describe('fieldsOf', () => {
    it('splits slot data from legacy fields', () => {
        const { slotKey, slot, legacy } = fieldsOf(slotRow());

        expect(slotKey).toBe('sys');
        expect(slot).toEqual({ fortune: 1, conditionTests: ['x'] });
        expect(legacy).toEqual({});
    });

    it('collects legacy fields from snapshot and state', () => {
        const { slotKey, legacy } = fieldsOf(legacyRow());

        expect(slotKey).toBeUndefined();
        expect(legacy).toEqual({
            fortune: 2,
            channelledSl: 3,
            psychologyTested: { fear: 1 },
        });
    });
});

describe('hashMismatch', () => {
    it('compares the stored hash with hashJson(snapshot)', () => {
        expect(hashMismatch(legacyRow())).toBe(false);
        expect(hashMismatch({ ...legacyRow(), snapshotHash: 'x' })).toBe(true);
    });
});

describe('downgradeParticipant', () => {
    it('writes slot values back to the flat fields and drops the slot', () => {
        const result = downgradeParticipant(slotRow());

        expect(result.changed).toBe(true);
        expect(result.unmapped).toEqual([]);
        expect(result.snapshot).toEqual({
            basicInfo: { id: 'p1' },
            battleData: { fortune: 1, conditionTests: ['x'] },
        });
        expect(result.state).toEqual({ activeEffects: [] });
    });

    it('keeps the hash consistent with the new snapshot', () => {
        const result = downgradeParticipant(slotRow());

        expect(result.snapshotHash).toBe(hashJson(result.snapshot));
        expect(hashMismatch({ ...slotRow(), ...result })).toBe(false);
    });

    it('moves state-bound slot fields into state', () => {
        const result = downgradeParticipant(
            row(
                { battleData: {} },
                {
                    system: {
                        key: 'sys',
                        data: { psychologyTested: { fear: 2 } },
                    },
                }
            )
        );

        expect(result.state).toEqual({ psychologyTested: { fear: 2 } });
        expect(result.snapshot).toEqual({ battleData: {} });
    });

    it('removes a stale legacy field that has no pair in the slot', () => {
        const result = downgradeParticipant(
            row(
                { battleData: { fortune: 5, channelledSl: 2 } },
                {
                    psychologyTested: { fear: 1 },
                    system: { key: 'sys', data: { fortune: 1 } },
                }
            )
        );

        expect(result.snapshot).toEqual({ battleData: { fortune: 1 } });
        expect(result.state).toEqual({});
    });

    it('slot wins over the old copy of the same field', () => {
        const result = downgradeParticipant(
            row(
                { battleData: { fortune: 5 } },
                { system: { key: 'sys', data: { fortune: 1 } } }
            )
        );

        expect(result.snapshot).toEqual({ battleData: { fortune: 1 } });
    });

    it('leaves a row without a slot unchanged', () => {
        const input = legacyRow();

        const result = downgradeParticipant(input);

        expect(result).toMatchObject({
            changed: false,
            unmapped: [],
            snapshot: input.snapshot,
            state: input.state,
            snapshotHash: input.snapshotHash,
        });
    });

    it('reports unknown data keys and ext modules as unmapped', () => {
        const result = downgradeParticipant(
            row(
                { battleData: {} },
                {
                    system: {
                        key: 'sys',
                        data: { fortune: 1, mystery: 1, ext: { other: {} } },
                    },
                }
            )
        );

        expect(result.unmapped).toEqual(['data.mystery', 'ext.other']);
    });

    it('is idempotent', () => {
        const once = downgradeParticipant(slotRow());

        const twice = downgradeParticipant({
            ...slotRow(),
            snapshot: once.snapshot,
            state: once.state,
            snapshotHash: once.snapshotHash,
        });

        expect(twice.changed).toBe(false);
        expect(twice.snapshot).toEqual(once.snapshot);
        expect(twice.state).toEqual(once.state);
    });

    it('maps ext through EXT_TO_LEGACY when configured', () => {
        EXT_TO_LEGACY.mod = { from: 'used', to: 'usedLegacy' };

        try {
            const result = downgradeParticipant(
                row(
                    { battleData: {} },
                    {
                        usedLegacy: 9,
                        system: {
                            key: 'sys',
                            data: { ext: { mod: { used: 2 } } },
                        },
                    }
                )
            );

            expect(result.unmapped).toEqual([]);
            expect(result.state).toEqual({ usedLegacy: 2 });
        } finally {
            delete EXT_TO_LEGACY.mod;
        }
    });
});

describe('downgradeHistory', () => {
    const history = () => ({
        scene: { round: 1 },
        participants: [
            {
                columns: { id: 'p1' },
                state: {
                    activeEffects: [],
                    system: {
                        key: 'sys',
                        data: { fortune: 1, psychologyTested: { a: 1 } },
                    },
                },
            },
            { columns: { id: 'p2' }, state: { activeEffects: [] } },
        ],
        changedSnapshots: {
            p1: { battleData: { fortune: 4 } },
        },
    });

    it('aligns state fields exactly and injects snapshot fields into changedSnapshots', () => {
        const result = downgradeHistory(history());

        expect(result.changed).toBe(true);
        expect(result.state).toMatchObject({
            participants: [
                {
                    state: {
                        activeEffects: [],
                        psychologyTested: { a: 1 },
                    },
                },
                { state: { activeEffects: [] } },
            ],
            changedSnapshots: { p1: { battleData: { fortune: 1 } } },
        });
        expect(
            (result.state as { participants: { state: object }[] })
                .participants[0].state
        ).not.toHaveProperty('system');
    });

    it('does not invent changedSnapshots for a participant without one', () => {
        const input = history();

        delete (input as { changedSnapshots?: unknown }).changedSnapshots;

        const result = downgradeHistory(input);

        expect(result.state).not.toHaveProperty('changedSnapshots');
    });

    it('aligns removed participants fully, hash included', () => {
        const input = {
            participants: [],
            removed: [
                {
                    columns: { id: 'p3' },
                    snapshot: { battleData: { fortune: 7 } },
                    state: { system: { key: 'sys', data: { sin: 2 } } },
                    snapshotHash: 'old',
                },
            ],
        };

        const { state } = downgradeHistory(input);

        const [removed] = (
            state as {
                removed: {
                    snapshot: unknown;
                    state: unknown;
                    snapshotHash: string;
                }[];
            }
        ).removed;

        expect(removed.snapshot).toEqual({ battleData: { sin: 2 } });
        expect(removed.state).toEqual({});
        expect(removed.snapshotHash).toBe(hashJson(removed.snapshot));
    });

    it('collects unmapped keys', () => {
        const input = history();

        input.participants[0].state.system.data = { zzz: 1 } as never;

        expect(downgradeHistory(input).unmapped).toEqual(['data.zzz']);
    });

    it('leaves rows without slots unchanged and is idempotent', () => {
        const plain = { participants: [{ columns: { id: 'p' }, state: {} }] };

        expect(downgradeHistory(plain).changed).toBe(false);

        const once = downgradeHistory(history());

        expect(downgradeHistory(once.state).changed).toBe(false);
    });

    it('tolerates a non-object state', () =>
        expect(downgradeHistory(null)).toEqual({
            state: null,
            changed: false,
            unmapped: [],
        }));
});

describe('ratchet', () => {
    it('keeps system names out of the CLIs and libs', () => {
        const files = [
            'active-battles-report.ts',
            'battle-state-downgrade.ts',
            'lib/battle-state-shapes.ts',
            'lib/battle-state-plan.ts',
            'lib/battle-state-db.ts',
        ];

        const text = files
            .map((f) =>
                fs.readFileSync(path.join(ROOT, 'scripts/db', f), 'utf8')
            )
            .join('\n');

        expect(countLiterals(text, literalTokens())).toBe(0);
    });
});
