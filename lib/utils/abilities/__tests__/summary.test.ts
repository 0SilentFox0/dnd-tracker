import { describe, expect, it } from "vitest";

import { abilitySummary, withAbilitySummary } from "@/lib/utils/abilities/summary";

const ability = { id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

describe("abilitySummary", () => {
  it("описує збережені вміння", () => {
    expect(abilitySummary("skill", { id: "s1", abilities: [ability] })).toEqual([expect.stringMatching(/шкода \(ближня\) \+10%/)]);
  });

  it("тип шкоди українською, мітка без сирого id", () => {
    const a = { id: "a2", name: "Отрута", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dealDamage", amount: 3, damageType: "poison" }, { kind: "mark", markId: "godric-offender", target: "eventTarget", duration: { rounds: 2 } }] };

    const [line] = abilitySummary("skill", { id: "s2", abilities: [a] });

    expect(line).toContain("Отрута");
    expect(line).not.toContain("poison");
    expect(line).not.toContain("godric-offender");
  });

  it("withAbilitySummary прибирає abilities та вказані колонки", () => {
    const row = withAbilitySummary("unit", { id: "u1", name: "Гоблін", abilities: [ability], specialAbilities: [{ x: 1 }] }, ["specialAbilities"]);

    expect(row).toEqual({ id: "u1", name: "Гоблін", abilitySummary: [expect.any(String)] });
  });
});
