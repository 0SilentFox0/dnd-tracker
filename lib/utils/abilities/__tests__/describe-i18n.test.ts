import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { describeAbility, describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Ability } from "@/lib/utils/abilities/schema";

const ability: Ability = {
  id: "a",
  name: "Test",
  trigger: { event: "hit", role: "attacker", whose: "ally" },
  limits: { perBattle: 2, perRest: { rest: "short", uses: 3 }, chance: 25 },
  effects: [
    { kind: "dealDamage", amount: { percentOf: "eventDamage", value: 50 }, damageType: "fire", target: "eventTarget" },
    { kind: "applyCondition", condition: "stunned", duration: { rounds: 2 }, saveEnds: { ability: "wisdom" }, target: "eventTarget" },
    { kind: "flag", flag: "resistance", damageType: "fire", percent: -25, attackKind: "ranged" },
    { kind: "flag", flag: "saveAdvantage", abilities: ["wisdom", "charisma"], vsSpells: true },
    { kind: "modifyStat", stat: "speed", flat: 2 },
  ],
} as Ability;

describe("ability descriptions render from the catalogs", () => {
  it("uk keeps the original wording", () => {
    expect(textOf(describeAbility(ability), "uk")).toBe(
      "Влучання · іншого союзника · 2 рази за бій · 3 рази за короткий відпочинок · 25% · шкода 50% від завданої шкоди Вогонь · приголомшений × 2 р., рятівний кидок Мудрість · вразливість fire 25% (дальні атаки) · перевага на рятівні кидки (Мудрість, Харизма) проти заклинань · швидкість +2",
    );
  });

  it("en renders the same structure", () => {
    expect(textOf(describeAbility(ability), "en")).toContain("2 times per battle");
    expect(textOf(describeEffect({ kind: "flag", flag: "evasion" } as Ability["effects"][number]), "en")).toBe("Dexterity saving throw with half damage: success — 0, failure — half");
  });
});
