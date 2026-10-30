import { describe, expect, it } from "vitest";

import { ingredientsGate } from "@/lib/utils/battle/spell/ingredients";
import { parseRules } from "@/lib/utils/rules/schema";
import { buildIngredientStock } from "@/lib/utils/spells/ingredients/stock";
import type { BattleParticipant, IngredientStock } from "@/types/battle";

const rules = parseRules({ spellIngredients: { enabled: true } });

const spell = { ingredients: [{ name: "Diamond", qty: 1, consumed: true, focus: false, minGp: 300 }] } as never;

const caster = (ingredientStock?: IngredientStock) => ({ battleData: { ...(ingredientStock && { ingredientStock }) } }) as BattleParticipant;

const source = { free: false };

describe("ingredientsGate", () => {
  it("rejects a hero with an empty stock", () => {
    const stock = buildIngredientStock({ items: [], gold: 0, silver: 0, copper: 0 }, { withPurse: true });

    expect(() => ingredientsGate(caster(stock), spell, rules, source)).toThrow();
  });

  it("is inactive for a unit or NPC without a stock", () => {
    expect(ingredientsGate(caster(), spell, rules, source)).toBeNull();
  });
});
