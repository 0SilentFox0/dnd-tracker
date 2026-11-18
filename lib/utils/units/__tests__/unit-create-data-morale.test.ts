import { describe, expect, it } from 'vitest';

import '@/lib/server/systems/registry';
import { createUnitSchema } from '@/lib/schemas/units';
import { moraleUpdate } from '@/lib/utils/rules/morale-store';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { unitCreateData } from '@/lib/utils/units/unit-create-data';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const homm = ruleSystemOf(parseRules({ system: { key: 'homm' } }));

const wfrp = ruleSystemOf(parseRules(WFRP_RULES));

describe('morale dual-write', () => {
    it('unit create writes the column and ext.morale.value', () => {
        const data = createUnitSchema.parse({ name: 'U', morale: 2 });

        const out = unitCreateData('c1', data, homm);

        expect(out.morale).toBe(2);
        expect(out.characteristics).toMatchObject({
            ext: { morale: { value: 2 } },
        });
    });

    it('keeps other characteristics and ext keys', () => {
        const out = moraleUpdate(
            homm,
            { characteristics: { strength: 9, ext: { other: { a: 1 } } } },
            -1
        );

        expect(out).toEqual({
            morale: -1,
            characteristics: {
                strength: 9,
                ext: { other: { a: 1 }, morale: { value: -1 } },
            },
        });
    });

    it('a system without the module still writes the ext value (readers prefer it)', () => {
        expect(moraleUpdate(wfrp, { characteristics: { ws: 3 } }, 2)).toEqual({
            morale: 2,
            characteristics: { ws: 3, ext: { morale: { value: 2 } } },
        });
    });

    it('unit create writes ext morale 0 too', () => {
        const data = createUnitSchema.parse({ name: 'U' });

        expect(unitCreateData('c1', data, homm).characteristics).toMatchObject({
            ext: { morale: { value: 0 } },
        });
    });
});
