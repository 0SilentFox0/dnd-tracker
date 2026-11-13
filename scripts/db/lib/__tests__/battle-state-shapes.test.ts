import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import {
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

    it('lists an ext value under the name of its flat counterpart', () => {
        const { slot } = fieldsOf(
            row(
                { basicInfo: { id: 'p1' }, battleData: {} },
                {
                    system: {
                        key: 'sys',
                        data: {
                            inspiration: true,
                            ext: { retaliation: { used: 1 } },
                        },
                    },
                }
            )
        );

        expect(slot).toEqual({ inspiration: true, retaliationsUsed: 1 });
    });
});

describe('hashMismatch', () => {
    it('compares the stored hash with hashJson(snapshot)', () => {
        expect(hashMismatch(legacyRow())).toBe(false);
        expect(hashMismatch({ ...legacyRow(), snapshotHash: 'x' })).toBe(true);
    });
});

describe('shapeOf on the flat fields of the d20 codec', () => {
    it('sees them as legacy', () => {
        for (const battleData of [
            { deathSaves: { successes: 1, failures: 2, stable: false } },
            { inspiration: true },
            { inspirationSpent: true },
            { attackedWithLight: true },
        ])
            expect(shapeOf(row({ battleData }, {}))).toBe('legacy');

        expect(shapeOf(row({ battleData: {} }, { retaliationsUsed: 1 }))).toBe(
            'legacy'
        );
    });
});

describe('ratchet', () => {
    it('keeps system names out of the CLIs and libs', () => {
        const files = [
            'active-battles-report.ts',
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
