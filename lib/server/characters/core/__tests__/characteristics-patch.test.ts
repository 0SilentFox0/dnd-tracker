import { describe, expect, it } from 'vitest';

import { characteristicsPatch } from '@/lib/server/characters/core/characteristics-patch';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const system = ruleSystemOf(DEFAULT_RULES);

describe('characteristicsPatch', () => {
    it('folds d20 columns into characteristics and keeps the previous keys', () => {
        expect(
            characteristicsPatch({ strength: 14, level: 3 }, system, {
                wisdom: 12,
            })
        ).toEqual({ characteristics: { wisdom: 12, strength: 14 } });
    });

    it('is empty without statblock columns', () => {
        expect(characteristicsPatch({ level: 3 }, system, {})).toEqual({});
    });
});
