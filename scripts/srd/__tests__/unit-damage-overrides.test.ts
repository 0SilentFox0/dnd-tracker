import { describe, expect, it } from 'vitest';

import { UNIT_DAMAGE_OVERRIDES } from '../overrides/units';

describe('UNIT_DAMAGE_OVERRIDES', () => {
    it('carries the canon weaknesses', () => {
        expect(UNIT_DAMAGE_OVERRIDES['srd-2024_skeleton'].vulnerabilities).toEqual(
            ['bludgeoning']
        );
        expect(UNIT_DAMAGE_OVERRIDES['srd-2024_mummy'].vulnerabilities).toEqual([
            'fire',
        ]);
        expect(UNIT_DAMAGE_OVERRIDES['srd-2024_treant']).toEqual({
            vulnerabilities: ['fire'],
            resistances: ['bludgeoning', 'piercing'],
        });
    });

    it('never lists the same type as both vulnerability and resistance', () => {
        for (const o of Object.values(UNIT_DAMAGE_OVERRIDES))
            expect(
                (o.vulnerabilities ?? []).filter((t) =>
                    (o.resistances ?? []).includes(t)
                )
            ).toEqual([]);
    });
});
