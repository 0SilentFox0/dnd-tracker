import type { Recipe, RecipeContext, RecipeResult, RecipeValues } from "./types";

import { newEffect } from "@/lib/utils/abilities/editor";
import { type Ability, AbilitySchema } from "@/lib/utils/abilities/schema";
import { DICE_PATTERN } from "@/lib/utils/common/dice";
import { SpellEffectSchema } from "@/lib/utils/spells/model/schema";

export const FROM_SCRATCH_ID = "custom";

const DICE_ISSUE = "abilities.validation.diceFormat";

export function buildScratchAbility({ name, note }: { name: string; note: string }): Omit<Ability, "id"> {
  return { name, trigger: { event: "passive" }, effects: [{ ...newEffect("note", { event: "passive" }), kind: "note", text: note }] };
}

const validDice = (s: string) => {
  const m = DICE_PATTERN.exec(s);

  return !!m && Number(m[1]) > 0 && Number(m[2]) > 0;
};

function resolveValues(recipe: Recipe): (v: RecipeValues, issues: string[]) => RecipeValues {
  return (values, issues) => {
    const out: RecipeValues = {};

    for (const p of recipe.params) {
      const raw = values[p.key];

      if (p.kind === "dice") {
        const text = typeof raw === "string" ? raw.trim() : "";

        if (text && !validDice(text)) issues.push(DICE_ISSUE);

        out[p.key] = text || p.default;
      } else if (p.kind === "number" || p.kind === "duration") {
        const n = typeof raw === "number" ? raw : raw === undefined || raw === "" ? NaN : Number(raw);

        out[p.key] = Number.isFinite(n) ? Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, n)) : p.default;
      } else {
        out[p.key] = raw !== undefined && raw !== "" && (!p.options || p.options.includes(String(raw))) ? raw : p.default;
      }
    }

    return out;
  };
}

export function buildRecipe(recipe: Recipe, values: RecipeValues, ctx: RecipeContext): { ok: true; result: RecipeResult } | { ok: false; issues: string[] } {
  const issues: string[] = [];

  const resolved = resolveValues(recipe)(values, issues);

  if (issues.length) return { ok: false, issues };

  const result = recipe.build(resolved, ctx);

  if ("ability" in result) {
    const parsed = AbilitySchema.safeParse({ id: "tmp", ...result.ability });

    return parsed.success ? { ok: true, result } : { ok: false, issues: parsed.error.issues.map((i) => i.message) };
  }

  for (const effect of result.spell) {
    const parsed = SpellEffectSchema.safeParse(effect);

    if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => i.message) };
  }

  return { ok: true, result };
}
