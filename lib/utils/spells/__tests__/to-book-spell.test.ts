import { describe, expect, it } from "vitest";

import { toBookSpell } from "@/lib/utils/spells/to-book-spell";

const row = { id: "s", name: "Мітка", level: 1, description: null, icon: null, spellGroup: { id: "g", name: "Віщування" } };

describe("toBookSpell", () => {
  it("keeps fixed dice and signed flat bonuses in the book preview", () => {
    expect(toBookSpell({ ...row, dice: 2, fixedDice: true, damageBonus: -3 })).toMatchObject({ dice: 2, fixedDice: true, damageBonus: -3 });
  });

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

  it("ефекти й стакання — для прев'ю ефекту в бою; стакання лише коли увімкнене", () => {
    const effects = [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }];

    expect(toBookSpell({ ...row, spellEffects: effects, stackable: false, maxStacks: 5 })).toEqual({ ...row, dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: effects });
    expect(toBookSpell({ ...row, spellEffects: [{ kind: "teleport" }], stackable: true, maxStacks: 3 })).toMatchObject({ spellEffects: [], stackable: true, maxStacks: 3 });
  });
});
