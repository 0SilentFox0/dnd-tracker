import { describe, expect, it } from "vitest";

import classes from "@/data/templates/srd-5.2/classes.json";
import { ArtifactSlot } from "@/lib/constants/artifacts";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { armorPenalty, isWeaponProficient, parseArmorProficiency } from "@/lib/utils/battle/proficiency";
import { classProficiencies, withGrantedProficiencies } from "@/lib/utils/battle/proficiency/collect";
import type { BattleParticipant } from "@/types/battle";
import type { GameClassData } from "@/types/classes";

const srd = (name: string) => {
  const c = classes.find((x) => x.name === name)!;

  return { ...c, multiclassProficiencies: c.proficiencies.multiclass } as unknown as GameClassData;
};

const heavy = { id: "plate", name: "Plate", slot: ArtifactSlot.ARMOR, modifiers: [{ type: "armorCategory", value: "heavy" }, { type: "armorBase", value: "18" }] };

const wearing = (p: BattleParticipant): BattleParticipant => ({ ...p, battleData: { ...p.battleData, equippedArtifacts: [heavy as never] } });

describe("classProficiencies", () => {
  it("перший клас дає повні володіння, решта — лише таблицю мультикласу", () => {
    const wizardFirst = classProficiencies([srd("Wizard"), srd("Fighter")]);

    expect(parseArmorProficiency(wizardFirst!.armor)).toEqual({ light: true, medium: true, heavy: false, shield: true });
  });

  it("Fighter → Wizard: Wizard нічого не додає до броні", () => {
    const merged = classProficiencies([srd("Fighter"), srd("Wizard")])!;

    expect(parseArmorProficiency(merged.armor)).toEqual({ light: true, medium: true, heavy: true, shield: true });
  });

  it("Wizard → Rogue: легка броня, але без бойової зброї", () => {
    const merged = classProficiencies([srd("Wizard"), srd("Rogue")])!;

    expect(parseArmorProficiency(merged.armor).light).toBe(true);
    expect(parseArmorProficiency(merged.armor).medium).toBe(false);
  });

  it("клас без володінь (кастомний/HOMM) — без перевірок", () => {
    expect(classProficiencies([{ ...srd("Fighter"), proficiencies: { armor: [], weapons: [], tools: [] } }])).toBeUndefined();
  });
});

describe("withGrantedProficiencies", () => {
  const base = (p: BattleParticipant) => ({ ...p, abilities: { ...p.abilities, proficiencies: { armor: ["Light armor"], weapons: ["Simple weapons"] } } });

  const grant = (flag: object) => resolved({ id: "g", trigger: { event: "passive" }, effects: [{ kind: "flag", ...flag } as never] }, { type: "feat", id: "f" });

  it("риса Heavily Armored дає володіння важкою бронею", () => {
    const p = base(makeParticipant({ id: "p", abilities: [grant({ flag: "proficiency", kinds: ["heavy"] })] }));

    expect(armorPenalty(wearing(p))).toBe(true);
    expect(armorPenalty(wearing(withGrantedProficiencies(p)))).toBe(false);
  });

  it("володіння зброєю з раси/риси", () => {
    const p = base(makeParticipant({ id: "p", abilities: [grant({ flag: "proficiency", kinds: ["martial"] })] }));

    const sword = { weaponCategory: "martial" as const };

    expect(isWeaponProficient(p, sword)).toBe(false);
    expect(isWeaponProficient(withGrantedProficiencies(p), sword)).toBe(true);
  });

  it("учасник без списку володінь лишається без перевірок", () => {
    const p = makeParticipant({ id: "p", abilities: [grant({ flag: "proficiency", kinds: ["heavy"] })] });

    expect(withGrantedProficiencies(p).abilities.proficiencies).toBeUndefined();
  });
});
