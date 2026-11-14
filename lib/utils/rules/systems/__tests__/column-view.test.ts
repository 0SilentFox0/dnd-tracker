import { describe, expect, it } from 'vitest';

import {
    flattenStoredColumns,
    splitColumnView,
    withColumnView,
    withStoredColumns,
} from '../column-view';

import '@/lib/server/systems/registry';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const d20 = ruleSystemOf(parseRules({ system: { key: 'dnd5e' } }));

const wfrp = ruleSystemOf(parseRules({ system: { key: 'wfrp' } }));

describe('withColumnView', () => {
    it('falls back to the column for missing keys, then the default', () => {
        const view = withColumnView(
            { characteristics: {}, strength: 14, armorClass: 15 },
            d20
        );

        expect(view).toMatchObject({
            strength: 14,
            armorClass: 15,
            initiative: 0,
            speed: 30,
        });
    });

    it('leaves a row without a characteristics key alone', () => {
        const row = { strength: 14 };

        expect(withColumnView(row, d20)).toBe(row);
    });

    it('prefers stored characteristics over columns', () => {
        const view = withColumnView(
            { characteristics: { strength: 18 }, strength: 10, speed: 30 },
            d20
        );

        expect(view).toMatchObject({ strength: 18, speed: 30 });
    });

    it('leaves wfrp rows untouched', () => {
        const row = { characteristics: { ws: 30 }, strength: 10 };

        expect(withColumnView(row, wfrp)).toBe(row);
    });
});

describe('splitColumnView', () => {
    it('splits columns and merges into previous characteristics', () => {
        const out = splitColumnView(
            { strength: 12, name: 'x', speed: 'fast' },
            d20,
            { dexterity: 9 }
        );

        expect(out.columns).toEqual({ strength: 12 });
        expect(out.characteristics).toEqual({ dexterity: 9, strength: 12 });
    });

    it('returns no characteristics when nothing matches or the system has no view', () => {
        expect(splitColumnView({ name: 'x' }, d20).characteristics).toBe(
            undefined
        );
        expect(splitColumnView({ strength: 12 }, wfrp)).toEqual({
            characteristics: undefined,
            columns: {},
        });
    });
});

describe('withStoredColumns', () => {
    it('stored numbers win and absent keys keep the column', () => {
        expect(
            withStoredColumns({
                characteristics: { strength: 18 },
                strength: 10,
                speed: 25,
            })
        ).toMatchObject({ strength: 18, speed: 25 });
    });

    it('leaves wfrp-like characteristics alone', () => {
        const row = { characteristics: { ws: 30 }, strength: 10 };

        expect(withStoredColumns(row)).toBe(row);
    });
});

describe('flattenStoredColumns', () => {
    it('moves stored values out; null when only the statblock was inside', () => {
        expect(
            flattenStoredColumns({
                characteristics: { strength: 18 },
                strength: 10,
            })
        ).toEqual({ strength: 18, characteristics: null });
        expect(
            flattenStoredColumns({
                characteristics: { strength: 18, ws: 3 },
                strength: 10,
            })
        ).toEqual({ strength: 18, characteristics: { ws: 3 } });
    });
});
