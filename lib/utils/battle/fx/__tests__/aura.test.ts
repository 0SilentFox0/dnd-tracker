import { describe, expect, it } from "vitest";

import { auraOf, aurasOf, MAX_AURAS } from "@/lib/utils/battle/fx/aura";
import type { ActiveEffect } from "@/types/battle";
import { ParticipantSide } from "@/types/battle";

const fx = (over: Partial<ActiveEffect>): ActiveEffect => ({ id: over.id ?? "e", name: "e", type: "debuff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], ...over });

describe("auraOf", () => {
  it("dot damage types map to their auras", () => {
    const dot = (damageType: string) => auraOf(fx({ dotDamage: { damagePerRound: 3, damageType } }));

    expect(dot("poison")).toBe("plague");
    expect(dot("acid")).toBe("plague");
    expect(dot("fire")).toBe("burning");
    expect(dot("cold")).toBe("frost");
    expect(dot("necrotic")).toBe("decay");
    expect(dot("bleed")).toBe("bleeding");
    expect(dot("slashing")).toBe("bleeding");
    expect(dot("lightning")).toBe("static");
    expect(dot("thunder")).toBe("static");
    expect(dot("psychic")).toBe("decay");
  });

  it("conditions: skip_action → stun, berserk → rage, others → bind", () => {
    expect(auraOf(fx({ type: "condition", effects: [{ type: "skip_action", value: 100 }] }))).toBe("stun");
    expect(auraOf(fx({ type: "condition", effects: [{ type: "berserk", value: 50 }] }))).toBe("rage");
    expect(auraOf(fx({ type: "condition", effects: [{ type: "no_reaction", value: 1 }] }))).toBe("bind");
  });

  it("charm, regen, mark, buff, debuff", () => {
    expect(auraOf(fx({ charmOrigin: { side: ParticipantSide.ALLY, controlledBy: "u" } }))).toBe("charm");
    expect(auraOf(fx({ type: "buff", hotHeal: { healPerRound: 4 } }))).toBe("regen");
    expect(auraOf(fx({ abilityEffects: [{ kind: "flag", flag: "advantageForAttackers" }] as ActiveEffect["abilityEffects"] }))).toBe("marked");
    expect(auraOf(fx({ type: "buff" }))).toBe("blessing");
    expect(auraOf(fx({ type: "buff", effects: [{ type: "ac_bonus", value: 2 }] }))).toBe("blessing");
    expect(auraOf(fx({ type: "buff", effects: [{ type: "ac", value: 2 }] }))).toBe("shield");
    expect(auraOf(fx({ type: "buff", abilityEffects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] as ActiveEffect["abilityEffects"] }))).toBe("shield");
    expect(auraOf(fx({ type: "debuff" }))).toBe("curse");
  });

  it("permanent, zone and expired effects have no aura", () => {
    expect(auraOf(fx({ type: "buff", permanent: true }))).toBeNull();
    expect(auraOf(fx({ type: "buff", zone: { ownerId: "o", key: "z" } }))).toBeNull();
    expect(auraOf(fx({ type: "buff", duration: 0 }))).toBeNull();
  });
});

describe("spell-check aura rules", () => {
  it("name map", () => {
    const named = (name: string) => auraOf(fx({ name, type: "debuff" }));

    expect(named("Корені")).toBe("roots");
    expect(named("Сплутування")).toBe("roots");
    expect(named("Сліпота")).toBe("blind");
    expect(named("Вампіризм")).toBe("bloodlust");
    expect(named("Поспіх")).toBe("haste");
    expect(named("Землетрус")).toBe("dust");
    expect(named("Рій ос")).toBe("stings");
  });

  it("fxElement maps debuffs and conditions", () => {
    const el = (fxElement: string, over: Partial<ActiveEffect> = {}) => auraOf(fx({ fxElement, ...over }));

    expect(el("cold")).toBe("frost");
    expect(el("cold", { type: "condition", effects: [{ type: "skip_action", value: 100 }] })).toBe("frozen");
    expect(el("lightning")).toBe("static");
    expect(el("fire")).toBe("burning");
    expect(el("poison")).toBe("plague");
    expect(el("necrotic")).toBe("decay");
    expect(el("radiant", { abilityEffects: [{ kind: "flag", flag: "advantageForAttackers" }] as ActiveEffect["abilityEffects"] })).toBe("moonmark");
    expect(el("radiant")).toBe("curse");
  });

  it("charm and berserk beat fxElement; buffs ignore it", () => {
    expect(auraOf(fx({ fxElement: "cold", charmOrigin: { side: ParticipantSide.ALLY, controlledBy: "u" } }))).toBe("charm");
    expect(auraOf(fx({ fxElement: "cold", type: "condition", effects: [{ type: "berserk", value: 50 }] }))).toBe("rage");
    expect(auraOf(fx({ fxElement: "fire", type: "buff" }))).toBe("blessing");
  });

  it("priority places new kinds", () => {
    const kinds = (...names: string[]) => aurasOf(names.map((name, i) => fx({ id: String(i), name })));

    expect(kinds("Корені", "Сліпота")).toEqual(["roots", "blind"]);
    expect(aurasOf([fx({ id: "a", type: "condition", fxElement: "cold", effects: [{ type: "skip_action", value: 1 }] }), fx({ id: "b", type: "condition", effects: [{ type: "skip_action", value: 1 }] })])).toEqual(["stun", "frozen"]);
    expect(kinds("Поспіх", "Корені")).toEqual(["roots", "haste"]);
  });
});
describe("aurasOf", () => {
  it(`keeps at most ${MAX_AURAS}, by priority, without duplicates`, () => {
    const list = [
      fx({ id: "1", type: "buff" }),
      fx({ id: "2", dotDamage: { damagePerRound: 2, damageType: "poison" } }),
      fx({ id: "3", dotDamage: { damagePerRound: 2, damageType: "poison" } }),
      fx({ id: "4", type: "condition", effects: [{ type: "skip_action", value: 100 }] }),
    ];

    expect(aurasOf(list)).toEqual(["stun", "plague"]);
  });

  it("rage ranks right after charm", () => {
    const list = [
      fx({ id: "1", type: "condition", effects: [{ type: "no_reaction", value: 1 }] }),
      fx({ id: "2", type: "condition", effects: [{ type: "berserk", value: 50 }] }),
    ];

    expect(aurasOf(list)).toEqual(["rage", "bind"]);
  });

  it("no effects → []", () => {
    expect(aurasOf([])).toEqual([]);
  });
});
