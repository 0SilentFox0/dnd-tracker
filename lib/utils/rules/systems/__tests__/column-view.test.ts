import { describe, expect, it } from 'vitest';

import { splitColumnView, withColumnView } from '../column-view';

import '@/lib/server/systems/registry';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const d20 = ruleSystemOf(parseRules({ system: { key: 'dnd5e' } }));

const wfrp = ruleSystemOf(parseRules({ system: { key: 'wfrp' } }));

describe('withColumnView', () => {
    it('falls back to legacy columns when characteristics is empty', () => {
        const row = { characteristics: {}, strength: 14, armorClass: 15 };

        expect(withColumnView(row, d20)).toEqual(row);
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
