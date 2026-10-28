import { describe, expect, it } from "vitest";

import { buildUnitCreatePayload, buildUnitFormData, buildUnitUpdatePayload, emptyUnitFormDefaults } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

const unit = { id: "u1", name: "Гоблін", raceId: "r1", knownSpells: ["s1"], attacks: null, avatar: "https://x/a.png" } as unknown as Unit;

describe("unit form", () => {
  it("preserves monster statblock and grants through editing", () => {
    const monster = { ...unit, cr: 3, statblock: { creatureType: "dragon", senses: { blindsight: 60 } }, spellcasting: { dc: 17, spells: [{ spellId: "breath", perBattle: 1, recharge: 5 as const }] } };

    expect(buildUnitUpdatePayload(buildUnitFormData(monster), monster)).toMatchObject({ statblock: monster.statblock, spellcasting: monster.spellcasting });
  });
  it("бере raceId юніта й нормалізує масиви", () => {
    const f = buildUnitFormData(unit);

    expect(f.raceId).toBe("r1");
    expect(f.attacks).toEqual([]);
    expect(f.avatar).toBe("https://x/a.png");
  });

  it("gridSize: дефолт 1, юніт із 2 зберігає 2 у формі й payload", () => {
    const big = { ...unit, gridSize: 2 } as unknown as Unit;

    expect(emptyUnitFormDefaults().gridSize).toBe(1);
    expect(buildUnitFormData(big).gridSize).toBe(2);
    expect(buildUnitUpdatePayload(buildUnitFormData(big), big).gridSize).toBe(2);
  });

  it("немає фолбеку на назву групи", () => {
    const legacy = { ...unit, raceId: null, race: " ", unitGroup: { name: "Гобліни" } } as unknown as Unit;

    expect(buildUnitFormData(legacy).raceId).toBeNull();
    expect(buildUnitFormData(legacy)).not.toHaveProperty("race");
  });

  it("порожня форма — без раси", () => {
    expect(emptyUnitFormDefaults()).toMatchObject({ raceId: null, avatar: null });
  });

  it("PATCH: avatar лише якщо змінився", () => {
    expect(buildUnitUpdatePayload(buildUnitFormData(unit), unit)).not.toHaveProperty("avatar");
    expect(buildUnitUpdatePayload({ avatar: "" }, unit).avatar).toBeNull();
    expect(buildUnitUpdatePayload({ avatar: " https://x/b.png " }, unit).avatar).toBe("https://x/b.png");
  });

  it("PATCH зберігає knownSpells, якщо форма їх не має; raceId null проходить", () => {
    const p = buildUnitUpdatePayload({ raceId: null }, unit);

    expect(p.knownSpells).toEqual(["s1"]);
    expect(p.raceId).toBeNull();
  });

  it("POST: порожній avatar → null, 0 лишається 0", () => {
    expect(buildUnitCreatePayload({ name: "Шаман", avatar: "  ", armorClass: 0 })).toMatchObject({ avatar: null, armorClass: 0 });
  });
});
