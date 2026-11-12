import { describe, expect, it } from 'vitest';

import { getProficiencyBonus } from '@/lib/utils/common/calculations';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { proficiencyForLevel } from '@/systems/d20/rules/proficiency/level';

describe('proficiencyForLevel', () => {
    it('defaults reproduce getProficiencyBonus for levels 1..20', () => {
        for (let l = 1; l <= 20; l++)
            expect(proficiencyForLevel(l, DEFAULT_RULES.formulas)).toBe(
                getProficiencyBonus(l)
            );
    });

    it('custom: base 1, every 3', () => {
        expect(
            proficiencyForLevel(1, {
                ...DEFAULT_RULES.formulas,
                proficiencyBase: 1,
                proficiencyEvery: 3,
            })
        ).toBe(1);
        expect(
            proficiencyForLevel(4, {
                ...DEFAULT_RULES.formulas,
                proficiencyBase: 1,
                proficiencyEvery: 3,
            })
        ).toBe(2);
    });
});
