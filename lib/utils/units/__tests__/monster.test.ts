import { describe, expect, it } from "vitest";

import { bestMentalAbility, isMonster5e, monsterSaveDc, multiattackAbilities, readSaveProficiencies, unitXp } from "@/lib/utils/units/monster";

describe("monster helpers", () => {
  it("isMonster5e — лише коли CR задано (0 теж)", () => {
    expect(isMonster5e({ cr: 0 })).toBe(true);
    expect(isMonster5e({ cr: null })).toBe(false);
    expect(isMonster5e({})).toBe(false);
  });

  it("unitXp: ручне XP має пріоритет; без CR і XP — null", () => {
    expect(unitXp({ cr: 5 })).toBe(1800);
    expect(unitXp({ cr: 5, xp: 2000 })).toBe(2000);
    expect(unitXp({ cr: null, xp: 300 })).toBe(300);
    expect(unitXp({ cr: null, xp: null })).toBeNull();
  });

  it("СК = база + майстерність + найкращий мод. Інт/Мдр/Хар; нічия — Інт", () => {
    expect(bestMentalAbility({ intelligence: 8, wisdom: 14, charisma: 16 })).toBe("charisma");
    expect(bestMentalAbility({ intelligence: 12, wisdom: 12, charisma: 12 })).toBe("intelligence");
    expect(monsterSaveDc(8, 3, { intelligence: 8, wisdom: 14, charisma: 16 })).toBe(14);
  });

  it("рятівні кидки: лише відомі ключі", () => {
    expect(readSaveProficiencies(["dexterity", "bogus", 3, "wisdom"])).toEqual(["dexterity", "wisdom"]);
    expect(readSaveProficiencies(null)).toEqual([]);
  });

  it("мультиатака — пасивне вміння attacksPerAction = n − 1", () => {
    expect(multiattackAbilities({ id: "u1", name: "Огр", multiattack: 1 })).toEqual([]);

    const [a] = multiattackAbilities({ id: "u1", name: "Огр", multiattack: 3 });

    expect(a).toMatchObject({ key: "unit:u1:multiattack", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 2 }], source: { type: "unit", id: "u1" } });
  });
});
