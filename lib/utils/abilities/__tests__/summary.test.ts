import { describe, expect, it } from "vitest";

import { abilitySummary, withAbilitySummary } from "@/lib/utils/abilities/summary";

const ability = { id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

describe("abilitySummary", () => {
  it("описує збережені вміння", () => {
    expect(abilitySummary("skill", { id: "s1", abilities: [ability] })).toEqual([expect.stringMatching(/шкода \(ближня\) \+10%/)]);
  });

  it("withAbilitySummary прибирає abilities та вказані колонки", () => {
    const row = withAbilitySummary("unit", { id: "u1", name: "Гоблін", abilities: [ability], specialAbilities: [{ x: 1 }] }, ["specialAbilities"]);

    expect(row).toEqual({ id: "u1", name: "Гоблін", abilitySummary: [expect.any(String)] });
  });
});
