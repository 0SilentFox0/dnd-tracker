import { describe, expect, it } from "vitest";

import { toUnit } from "@/lib/utils/units/to-unit";

const row = {
  id: "u1",
  campaignId: "c1",
  name: "Гоблін",
  race: "Гобліни",
  raceId: "r1",
  groupId: "g1",
  groupColor: "#fff",
  damageModifier: "fire",
  level: 2,
  strength: 8,
  dexterity: 14,
  constitution: 10,
  intelligence: 10,
  wisdom: 8,
  charisma: 8,
  armorClass: 13,
  initiative: 2,
  speed: 30,
  maxHp: 7,
  proficiencyBonus: 2,
  attacks: [{ name: "Ніж", attackBonus: 4, damageType: "piercing", damageDice: "1d4" }],
  specialAbilities: [],
  knownSpells: null,
  avatar: null,
  createdAt: new Date(0),
  immunities: ["отрута"],
  morale: 0,
  maxTargets: 1,
  minTargets: 1,
  abilities: [],
};

describe("toUnit", () => {
  it("віддає лише живі поля: raceId замість race/групи, без damageModifier і сирих abilities", () => {
    const unit = toUnit(row as never);

    expect(unit).toMatchObject({ id: "u1", raceId: "r1", level: 2, knownSpells: [], immunities: ["отрута"], abilitySummary: [] });
    for (const legacy of ["race", "groupId", "groupColor", "damageModifier", "specialAbilities", "abilities", "unitGroup"]) {
      expect(unit).not.toHaveProperty(legacy);
    }
  });
});
