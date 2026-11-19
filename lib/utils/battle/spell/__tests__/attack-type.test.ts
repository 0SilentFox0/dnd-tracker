import { describe, expect, it } from 'vitest';

import { AttackType } from '@/lib/constants/battle';
import { spellAttackType } from '@/lib/utils/battle/spell/attack-type';
import { cantripTier } from '@/lib/utils/spells/model/dice';

describe('spellAttackType', () => {
    it('touch and self spells are melee, longer range is ranged', () => {
        expect(spellAttackType({ kind: 'enemy', range: 5 })).toBe(
            AttackType.MELEE
        );
        expect(spellAttackType({ kind: 'self' })).toBe(AttackType.MELEE);
        expect(spellAttackType({ kind: 'enemy', range: 120 })).toBe(
            AttackType.RANGED
        );
    });
});

describe('cantripTier', () => {
    it('steps at levels 5, 11 and 17', () => {
        expect([1, 4, 5, 10, 11, 16, 17, 20].map(cantripTier)).toEqual([
            1, 1, 2, 2, 3, 3, 4, 4,
        ]);
    });
});
