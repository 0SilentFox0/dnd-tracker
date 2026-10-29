import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { limitsLabel } from "@/lib/utils/abilities/registry/labels";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { abilityOptions } from "@/lib/utils/battle/view";

const wing = { id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] };

describe("limits.legendaryCost", () => {
  it("дозволено лише для вміння-дії, 1–3, без aim", () => {
    expect(AbilitySchema.safeParse(wing).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...wing, trigger: { event: "bonusAction" } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...wing, limits: { legendaryCost: 4 } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...wing, aim: { kind: "cell", range: 30 } }).success).toBe(false);
  });

  it("підпис ліміту", () => {
    expect(limitsLabel({ legendaryCost: 2 }).map((l) => textOf(l))).toEqual(["легендарна дія (2)"]);
  });

  it("у звичайному ході легендарне вміння приховане", () => {
    const normal = resolved({ id: "hit", name: "Удар", trigger: { event: "action" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const p = makeParticipant({ id: "d", abilities: [normal, resolved(wing as never)] });

    expect(abilityOptions(p, "action", 1).map((o) => o.ability.id)).toEqual(["hit"]);
  });
});

 describe("linked legendary and lair actions", () => {
  const linked = { ...wing, effects: [{ kind: "note", text: "Опис" }], perform: { kind: "attack", attack: "Хвіст" } };

  it("keeps a linked attack or spell only on legendary or lair actions", () => {
    expect(AbilitySchema.parse(linked)).toMatchObject({ perform: linked.perform });
    expect(AbilitySchema.parse({ ...linked, perform: { kind: "spell", spellId: "fear" } })).toMatchObject({ perform: { kind: "spell", spellId: "fear" } });
    expect(AbilitySchema.safeParse({ ...linked, limits: {} }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...linked, limits: { lair: true } }).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...linked, limits: { lair: true, legendaryCost: 1 } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...linked, trigger: { event: "bonusAction" }, limits: { lair: true } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...linked, effects: [{ kind: "heal", amount: 1 }] }).success).toBe(false);
  });

  it("hides lair actions during an ordinary turn", () => {
    const p = makeParticipant({ id: "d", abilities: [resolved({ ...wing, limits: { lair: true } } as never)] });

    expect(abilityOptions(p, "action", 1)).toEqual([]);
  });
});
