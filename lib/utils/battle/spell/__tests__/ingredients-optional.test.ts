import { describe, expect, it } from 'vitest';

import { ingredientsGate } from '@/lib/utils/battle/spell/ingredients';
import { parseRules } from '@/lib/utils/rules/schema';
import { buildIngredientStock } from '@/lib/utils/spells/ingredients/stock';
import type { BattleParticipant } from '@/types/battle';

const rules = parseRules({ spellIngredients: { enabled: true } });

const spell = {
    ingredients: [
        { name: 'Diamond', qty: 1, consumed: true, focus: false, minGp: 300 },
    ],
} as never;

const empty = {
    battleData: {
        ingredientStock: buildIngredientStock(
            { items: [], gold: 0, silver: 0, copper: 0 },
            { withPurse: true }
        ),
    },
} as BattleParticipant;

const rich = {
    battleData: {
        ingredientStock: buildIngredientStock(
            { items: [], gold: 400, silver: 0, copper: 0 },
            { withPurse: true }
        ),
    },
} as BattleParticipant;

describe('ingredientsGate in optional mode', () => {
    it('asks for nothing unless the ingredient is used', () => {
        expect(
            ingredientsGate(
                empty,
                spell,
                rules,
                { free: false },
                { optional: true, use: false }
            )
        ).toBeNull();
    });

    it('checks the stock once it is used', () => {
        expect(() =>
            ingredientsGate(
                empty,
                spell,
                rules,
                { free: false },
                { optional: true, use: true }
            )
        ).toThrow();
        expect(
            ingredientsGate(
                rich,
                spell,
                rules,
                { free: false },
                { optional: true, use: true }
            )?.ok
        ).toBe(true);
    });

    it('required mode still rejects an empty stock', () => {
        expect(() =>
            ingredientsGate(empty, spell, rules, { free: false })
        ).toThrow();
    });
});
