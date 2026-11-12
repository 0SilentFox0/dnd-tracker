import { describe, expect, it } from 'vitest';

import { ingredientsGate } from '@/lib/utils/battle/spell/ingredients';
import { parseRules } from '@/lib/utils/rules/schema';
import { currencyValueOf } from '@/lib/utils/rules/systems';
import { buildIngredientStock } from '@/lib/utils/spells/ingredients/stock';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant, IngredientStock } from '@/types/battle';

const rules = parseRules({ spellIngredients: { enabled: true } });

const spell = {
    ingredients: [
        { name: 'Diamond', qty: 1, consumed: true, focus: false, minGp: 300 },
    ],
} as never;

const caster = (ingredientStock?: IngredientStock) =>
    ({
        battleData: { ...(ingredientStock && { ingredientStock }) },
    }) as BattleParticipant;

const source = { free: false };

describe('ingredientsGate', () => {
    it('rejects a hero with an empty stock', () => {
        const stock = buildIngredientStock(
            { items: [], gold: 0, silver: 0, copper: 0 },
            { withPurse: true }
        );

        expect(() =>
            ingredientsGate(caster(stock), spell, rules, source)
        ).toThrow();
    });

    it('is inactive for a unit or NPC without a stock', () => {
        expect(ingredientsGate(caster(), spell, rules, source)).toBeNull();
    });

    describe('wfrp currency table', () => {
        const gc1 = {
            ingredients: [
                {
                    name: 'Diamond',
                    qty: 1,
                    consumed: true,
                    focus: false,
                    minGp: 1,
                },
            ],
        } as never;

        const wfrp = {
            ...WFRP_RULES,
            spellIngredients: {
                ...WFRP_RULES.spellIngredients,
                enabled: true,
                autoPay: true,
            },
        };

        const stockOf = (silver: number, gold = 0) =>
            buildIngredientStock(
                { items: [], gold, silver, copper: 0 },
                { withPurse: true, value: currencyValueOf(wfrp) }
            );

        it('a purse of 25 ss pays a 1 gc ingredient (300 d >= 240 d)', () => {
            const plan = ingredientsGate(
                caster(stockOf(25)),
                gc1,
                wfrp,
                source
            );

            expect(plan).toMatchObject({ ok: true, spendCp: 240 });
        });

        it('15 ss (180 d) cannot, though the d20 table would call it 150 cp enough', () => {
            expect(() =>
                ingredientsGate(caster(stockOf(15)), gc1, wfrp, source)
            ).toThrow();
        });

        it('d20 stays on 100 cp per gp', () => {
            const d20 = parseRules({
                spellIngredients: { enabled: true, autoPay: true },
            });

            const stock = buildIngredientStock(
                { items: [], gold: 0, silver: 10, copper: 0 },
                { withPurse: true }
            );

            expect(
                ingredientsGate(caster(stock), gc1, d20, source)
            ).toMatchObject({ ok: true, spendCp: 100 });
        });
    });
});
