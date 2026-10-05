import { describe, expect, it } from "vitest";

import type { Ability } from "@/lib/utils/abilities/schema";
import { damageAffinity, sheetStatBonuses } from "@/lib/utils/abilities/sheet-bonuses";

const passive = (effects: Ability["effects"], extra: Partial<Ability> = {}): Ability => ({ id: "a", name: "A", trigger: { event: "passive" }, effects, ...extra });

describe("sheetStatBonuses", () => {
  it("сумує пасивні плоскі бонуси на себе, слоти — за рівнями", () => {
    const r = sheetStatBonuses([
      passive([
        { kind: "modifyStat", stat: "strength", flat: 2 },
        { kind: "modifyStat", stat: "armor", flat: 1 },
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [1, 2], flat: 1 },
      ]),
      passive([{ kind: "modifyStat", stat: "strength", flat: -1 }]),
    ]);

    expect(r.stats).toEqual({ strength: 1, armorClass: 1 });
    expect(r.spellSlotBonusByLevel).toEqual({ "1": 1, "2": 1 });
  });

  it("ігнорує ауру, умовні, тригерні, відсоткові й формули", () => {
    const r = sheetStatBonuses([
      passive([{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }]),
      passive([{ kind: "modifyStat", stat: "armor", flat: 1 }], { condition: { type: "hpBelow", who: "self", percent: 50 } }),
      { id: "h", name: "H", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } }] },
      passive([{ kind: "modifyStat", stat: "speed", percent: 10 }]),
      passive([{ kind: "modifyStat", stat: "speed", flat: { formula: "level" } }]),
    ]);

    expect(r.stats).toEqual({});
  });
});

describe("damageAffinity", () => {
  it("пасивний бонус шкоди одного виду", () => {
    expect(damageAffinity([passive([{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }])])).toEqual({ affectsDamage: true, damageType: "melee" });
  });

  it("різні види → без типу; без бонусу → не впливає", () => {
    expect(damageAffinity([passive([{ kind: "damageBonus", filter: { kind: "melee" }, flat: 1 }, { kind: "damageBonus", filter: { kind: "magic" }, flat: 1 }])])).toEqual({ affectsDamage: true, damageType: null });
    expect(damageAffinity([passive([{ kind: "note", text: "x" }])])).toEqual({ affectsDamage: false, damageType: null });
  });
});
