import { describe, expect, it } from "vitest";

import { buildRecipe, buildScratchAbility, RECIPES } from "..";

import { ukT } from "@/lib/utils/abilities/__tests__/describe-fixtures";
import { allowedEffectKinds } from "@/lib/utils/abilities/editor";
import { describeAbilityText } from "@/lib/utils/abilities/registry/effects";
import { AbilitySchema } from "@/lib/utils/abilities/schema";

const t = await ukT();

const recipe = (id: string) => {
  const found = RECIPES.find((r) => r.id === id);

  if (!found) throw new Error(id);

  return found;
};

const ctx = { scope: "ability", name: "n", note: "t" } as const;

describe("buildRecipe", () => {
  it("every recipe builds valid defaults in each of its scopes", () => {
    for (const r of RECIPES) {
      for (const scope of r.scopes) {
        const res = buildRecipe(r, {}, { ...ctx, scope });

        expect(res.ok, `${r.id}/${scope}`).toBe(true);

        if (res.ok && "ability" in res.result) {
          const a = { id: "a1", ...res.result.ability };

          expect(AbilitySchema.safeParse(a).success, r.id).toBe(true);
          expect(describeAbilityText(a, t).length, r.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it("spell recipes use only kinds allowed for the action trigger", () => {
    const allowed = allowedEffectKinds({ event: "action" });

    for (const r of RECIPES.filter((x) => x.scopes.includes("spell"))) {
      const res = buildRecipe(r, {}, { ...ctx, scope: "spell" });

      if (!res.ok || !("spell" in res.result)) throw new Error(r.id);

      for (const e of res.result.spell) expect(allowed, r.id).toContain(e.kind);
    }
  });

  it("clamps numbers and falls back to default on NaN or empty", () => {
    const a = (v: Record<string, string | number>) => buildRecipe(recipe("stats"), v, ctx);

    const flat = (res: ReturnType<typeof a>) => (res.ok && "ability" in res.result ? (res.result.ability.effects[0] as { flat: number }).flat : null);

    expect(flat(a({ value: 999 }))).toBe(10);
    expect(flat(a({ value: -5 }))).toBe(1);
    expect(flat(a({ value: Number.NaN }))).toBe(1);
    expect(flat(a({ value: "" }))).toBe(1);
  });

  it("rejects malformed dice", () => {
    for (const bad of ["2d", "1d0", "d6"]) expect(buildRecipe(recipe("healSpell"), { dice: bad }, ctx).ok, bad).toBe(false);

    expect(buildRecipe(recipe("healSpell"), { dice: "2d6+1" }, ctx).ok).toBe(true);
    expect(buildRecipe(recipe("healSpell"), { dice: "" }, ctx).ok).toBe(true);
  });

  it("every option of select-like params builds", () => {
    for (const r of RECIPES) {
      for (const p of r.params.filter((x) => x.options)) {
        for (const o of p.options ?? []) {
          for (const scope of r.scopes) expect(buildRecipe(r, { [p.key]: o }, { ...ctx, scope }).ok, `${r.id}.${p.key}=${o}/${scope}`).toBe(true);
        }
      }
    }
  });

  it("only concentrationBuff sets concentration", () => {
    for (const r of RECIPES.filter((x) => x.scopes.includes("spell"))) {
      const res = buildRecipe(r, {}, { ...ctx, scope: "spell" });

      if (!res.ok || !("spell" in res.result)) throw new Error(r.id);

      expect(res.result.concentration === true, r.id).toBe(r.id === "concentrationBuff");
    }
  });

  it("scratch ability is an empty passive note", () => {
    const a = buildScratchAbility({ name: "n", note: "t" });

    expect(a.trigger).toEqual({ event: "passive" });
    expect(a.effects).toEqual([{ kind: "note", text: "t" }]);
    expect(AbilitySchema.safeParse({ id: "x", ...a }).success).toBe(true);
  });
});
