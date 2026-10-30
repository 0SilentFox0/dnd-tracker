import { API_ERRORS } from "@/lib/constants/api-errors";
import { COIN_VALUE } from "@/lib/constants/inventory";
import type { SpellIngredient } from "@/lib/schemas/spell-ingredients";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { Ruleset } from "@/lib/utils/rules";
import { trackedIngredients } from "@/lib/utils/spells/ingredients";
import { applyIngredientPlan, type IngredientPlan, planIngredients } from "@/lib/utils/spells/ingredients/plan";
import { formatMissing } from "@/lib/utils/spells/ingredients/summary";
import type { BattleParticipant, IngredientStock } from "@/types/battle";

interface GateSource {
  free: boolean;
  legendaryAbility?: unknown;
  grant?: unknown;
}

export function ingredientsGate(caster: BattleParticipant, spell: { ingredients?: SpellIngredient[] }, rules: Ruleset, source: GateSource): IngredientPlan | null {
  const stock = caster.battleData.ingredientStock;

  const list = spell.ingredients ?? [];

  if (!rules.spellIngredients.enabled || source.free || source.legendaryAbility || source.grant || !stock || trackedIngredients(list).length === 0) return null;

  const plan = planIngredients(list, stock, { autoPay: rules.spellIngredients.autoPay });

  if (!plan.ok) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING, { list: formatMissing(plan.missing) });

  return plan;
}

export function spendIngredients(caster: BattleParticipant, plan: IngredientPlan): BattleParticipant {
  const stock = caster.battleData.ingredientStock;

  return stock ? { ...caster, battleData: { ...caster.battleData, ingredientStock: applyIngredientPlan(stock, plan) } } : caster;
}

export function spentSummary(stock: IngredientStock, plan: IngredientPlan): string {
  const parts = stock.items.filter((i) => plan.spendItems[i.id]).map((i) => `${i.name} ×${plan.spendItems[i.id]}`);

  if (plan.spendCp > 0) parts.push(`${plan.spendCp / COIN_VALUE.gp} gp`);

  return parts.join(", ");
}
