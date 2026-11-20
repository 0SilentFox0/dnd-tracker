import { describe, expect, it } from 'vitest';

import type { ExposureDegree } from '../constants';
import { planExposureTest } from '../exposure';

import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

const run = (
    degree: ExposureDegree,
    presetRoll: number,
    skill: 'endurance' | 'cool' = 'endurance'
) =>
    planExposureTest({
        characteristics: {
            ...DEFAULT_CHARACTERISTICS,
            base: { ...DEFAULT_CHARACTERISTICS.base, t: 60, wp: 60 },
        },
        degree,
        skill,
        rng: () => 0.5,
        presetRoll,
    });

const rollForSl = (sl: number) => (sl === 0 ? 60 : (6 - sl) * 10 + 1);

describe('planExposureTest', () => {
    it('Minor: 1 on failure, otherwise 0', () => {
        expect(run('minor', 99).points).toBe(1);
        expect(run('minor', rollForSl(0)).points).toBe(0);
        expect(run('minor', rollForSl(3)).points).toBe(0);
    });

    it('Moderate: 2 / 1 on SL 0 / 0 on SL 1+', () => {
        expect(run('moderate', 99).points).toBe(2);
        expect(run('moderate', rollForSl(0)).points).toBe(1);
        expect(run('moderate', rollForSl(1)).points).toBe(0);
    });

    it('Major: 3 / 2 on SL 0 / 1 on SL 1-3 / 0 on SL 4+', () => {
        expect(run('major', 99).points).toBe(3);
        expect(run('major', rollForSl(0)).points).toBe(2);
        expect(run('major', rollForSl(1)).points).toBe(1);
        expect(run('major', rollForSl(3)).points).toBe(1);
        expect(run('major', rollForSl(4)).points).toBe(0);
    });

    it('reports the test and uses Willpower for Cool', () => {
        const r = run('major', 99, 'cool');

        expect(r.test.roll).toBe(99);
        expect(r.test.target).toBe(60);
        expect(r.test.outcome).toBe('failure');
    });
});
