import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import {
    fieldsOf,
    hashMismatch,
    type ParticipantRow,
    shapeOf,
} from '@/scripts/db/lib/battle-state-shapes';

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
    it('none without a slot', () =>
        expect(shapeOf(row({ battleData: {} }, {}))).toBe('none'));

    it('slot for a slot only, even an empty one', () => {
        expect(shapeOf(slotRow())).toBe('slot');
        expect(
            shapeOf(
                row({ battleData: {} }, { system: { key: 'sys', data: {} } })
            )
        ).toBe('slot');
    });

    it('ignores a malformed slot', () =>
        expect(shapeOf(row({ battleData: {} }, { system: { data: {} } }))).toBe(
            'none'
        ));
});

describe('fieldsOf', () => {
    it('reads slot data', () => {
        const { slotKey, slot } = fieldsOf(slotRow());

        expect(slotKey).toBe('sys');
        expect(slot).toEqual({ fortune: 1, conditionTests: ['x'] });
    });

    it('lists an ext value under ext.<module>', () => {
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

        expect(slot).toEqual({
            inspiration: true,
            'ext.retaliation': { used: 1 },
        });
    });
});

describe('hashMismatch', () => {
    it('compares the stored hash with hashJson(snapshot)', () => {
        expect(hashMismatch(slotRow())).toBe(false);
        expect(hashMismatch({ ...slotRow(), snapshotHash: 'x' })).toBe(true);
    });
});
