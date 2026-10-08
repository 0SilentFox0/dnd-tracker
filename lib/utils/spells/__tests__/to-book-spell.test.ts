import { describe, expect, it } from "vitest";

import { toBookSpell } from "@/lib/utils/spells/to-book-spell";

const row = { id: "s", name: "Мітка", level: 1, description: null, icon: null, spellGroup: { id: "g", name: "Віщування" } };

describe("toBookSpell", () => {
  it("коректний рядок проходить, нова модель зчитується", () => {
    expect(toBookSpell({ ...row, dice: 3, cost: "bonusAction", targeting: { kind: "area", side: "enemy", maxTargets: 2 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } })).toMatchObject({
      id: "s",
      dice: 3,
      cost: "bonusAction",
      targeting: { kind: "area", side: "enemy", maxTargets: 2 },
      resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
      spellGroup: { name: "Віщування" },
    });
  });

  it("порожні й зіпсовані колонки — значення за замовчуванням, а не сміття в UI", () => {
    expect(toBookSpell(row)).toMatchObject({ dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } });
    expect(toBookSpell({ ...row, targeting: { kind: "area" }, resolution: "dex", cost: "x" })).toMatchObject({ targeting: { kind: "enemy" }, resolution: { kind: "auto" }, cost: "action" });
  });
});
