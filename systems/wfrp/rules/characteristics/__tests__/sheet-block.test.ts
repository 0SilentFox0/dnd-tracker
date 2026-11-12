import { describe, expect, it } from 'vitest';

import { SHEET_SLOT } from '../../slots';
import { woundsMax } from '../derive';
import { DEFAULT_CHARACTERISTICS } from '../keys';
import { wfrpSheetBlock } from '../sheet-block';

const block = (input: Parameters<typeof wfrpSheetBlock>[0]) =>
    SHEET_SLOT.read(wfrpSheetBlock(input))!;

describe('wfrpSheetBlock sin', () => {
    it('reads Sin from resources, 0 when absent', () => {
        expect(
            block({
                characteristics: DEFAULT_CHARACTERISTICS,
                resources: { sin: 4 },
            }).sin
        ).toBe(4);
        expect(
            block({ characteristics: DEFAULT_CHARACTERISTICS, resources: {} })
                .sin
        ).toBe(0);
    });
});

describe('wfrpSheetBlock corruption', () => {
    const mutation = {
        id: 'm',
        at: '2026-01-01T00:00:00.000Z',
        kind: 'physical' as const,
        roll: 1,
        text: 'x',
        effects: [
            {
                type: 'characteristic' as const,
                key: 'ws' as const,
                amount: -10,
            },
            { type: 'move' as const, amount: -1 },
            { type: 'maxWounds' as const, amount: 2 },
        ],
    };

    it('exposes mod, effective move/wounds and the corruption block', () => {
        const result = block({
            characteristics: {
                ...DEFAULT_CHARACTERISTICS,
                corruption: { points: 4, mutations: [mutation] },
            },
            resources: {},
        });

        expect(
            result.characteristics.find((c) => c.key === 'ws')
        ).toMatchObject({ base: 30, advances: 0, value: 20, mod: -10 });
        expect(result.characteristics.find((c) => c.key === 't')?.mod).toBe(0);
        expect(result.move.value).toBe(3);
        expect(result.wounds.max).toBe(woundsMax(DEFAULT_CHARACTERISTICS) + 2);
        expect(result.corruption).toEqual({
            points: 4,
            threshold: 6,
            mutations: [mutation],
        });
    });

    it('defaults without corruption', () => {
        expect(
            block({ characteristics: DEFAULT_CHARACTERISTICS, resources: {} })
                .corruption
        ).toEqual({ points: 0, threshold: 6, mutations: [] });
    });
});
