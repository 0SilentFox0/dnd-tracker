import { describe, expect, it } from "vitest";

import { isSpellOnlyKind, newSpellOnlyEffect, pruneEmpty, SPELL_ONLY_LABEL_KEYS } from "../spell-only";

import { SPELL_ONLY_KINDS } from "@/lib/utils/battle/spell/cast/state";
import { SPELL_ONLY_EFFECT_KINDS, SpellEffectSchema } from "@/lib/utils/spells/model/schema";

describe("spell-only kinds", () => {
  it("список видів збігається з дискримінаторами схеми", () => {
    expect([...SPELL_ONLY_EFFECT_KINDS].sort()).toEqual(["anchoredZone", "chooseOne", "createTerrain", "grantCast", "hitRider", "inputDice", "moveSelf", "summonInline", "transform"]);
  });

  it("SPELL_ONLY_KINDS рушія (без zod у клієнті) збігається зі схемою без chooseOne", () => {
    expect([...SPELL_ONLY_KINDS].sort()).toEqual(SPELL_ONLY_EFFECT_KINDS.filter((k) => k !== "chooseOne").sort());
  });

  it.each(SPELL_ONLY_EFFECT_KINDS.filter((k) => k !== "transform"))("новий %s проходить схему", (kind) => {
    expect(SpellEffectSchema.safeParse(newSpellOnlyEffect(kind)).success).toBe(true);
  });

  it("transform без юніта — помилка на unitId", () => {
    const r = SpellEffectSchema.safeParse(newSpellOnlyEffect("transform"));

    expect(r.success).toBe(false);
  });

  it("isSpellOnlyKind і ключі підписів", () => {
    expect(isSpellOnlyKind("chooseOne")).toBe(true);
    expect(isSpellOnlyKind("heal")).toBe(false);
    expect(SPELL_ONLY_LABEL_KEYS.hitRider).toBe("spellEffects.kinds.hitRider");
  });

  it("pruneEmpty прибирає порожні об'єкти й undefined, масиви не чіпає", () => {
    expect(pruneEmpty({ a: {}, b: undefined, c: { d: {} }, e: [{}], f: 1 })).toEqual({ e: [{}], f: 1 });
  });
});
