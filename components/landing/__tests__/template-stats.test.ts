import { describe, expect, it } from 'vitest';

import { getTemplateStats } from '@/components/landing/template-stats';

describe('getTemplateStats', () => {
    it('counts the SRD 5.2 content', () => {
        expect(getTemplateStats('srd')).toEqual({
            spells: 499,
            units: 331,
            classes: 12,
            races: 9,
        });
    });

    it('counts the Grim d100 content', () => {
        const stats = getTemplateStats('grim');

        expect(stats.spells).toBe(252);
        expect(stats.units).toBe(80);
        expect(stats.races).toBe(5);
        expect(stats.classes).toBeGreaterThanOrEqual(0);
    });
});
