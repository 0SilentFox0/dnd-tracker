import { describe, expect, it } from "vitest";

import { legacyActiveEffectModifiers } from "../legacy-active-effects";

import type { ActiveEffect } from "@/types/battle";

const effect = (effects: ActiveEffect["effects"]): ActiveEffect => ({
  id: "e1",
  name: "Ефект",
  type: "buff",
  duration: 1,
  appliedAt: { round: 1, timestamp: new Date(0) },
  effects,
});

describe("legacyActiveEffectModifiers (ефекти заклинань і старі знімки)", () => {
  it("статові типи — modifyStat", () => {
    expect(legacyActiveEffectModifiers(effect([{ type: "ac_bonus", value: 2 }, { type: "attack_bonus", value: 1 }, { type: "initiative", value: 3 }]))).toEqual([
      { kind: "modifyStat", stat: "armor", flat: 2 },
      { kind: "modifyStat", stat: "attackBonus", flat: 1 },
      { kind: "modifyStat", stat: "initiative", flat: 3 },
    ]);
  });

  it("advantage / disadvantage — прапори", () => {
    expect(legacyActiveEffectModifiers(effect([{ type: "advantage_attack", value: 1 }, { type: "disadvantage_attack", value: 1 }]))).toEqual([
      { kind: "flag", flag: "advantage", attackKind: "all" },
      { kind: "flag", flag: "disadvantage" },
    ]);
  });

  it("бонуси шкоди за видом; відсоток, а не flat; невідомий вид ігнорується", () => {
    expect(legacyActiveEffectModifiers(effect([{ type: "melee_damage", value: 25, isPercentage: true }, { type: "fire_damage", value: 3 }]))).toEqual([
      { kind: "damageBonus", filter: { kind: "melee" }, percent: 25 },
    ]);
  });

  it("маркери станів і нульові значення ігноруються", () => {
    expect(legacyActiveEffectModifiers(effect([{ type: "no_reaction", value: 1 }, { type: "stun", value: 1 }, { type: "ac_bonus", value: 0 }]))).toEqual([
      { kind: "modifyStat", stat: "armor", flat: 0 },
    ]);
  });
});
