import { describe, expect, it } from "vitest";

import classes from "@/data/templates/srd-5.2/classes.json";
import { ArtifactSlot } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { calculateAttackBonus, rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { armorPenalty, isWeaponProficient, parseArmorProficiency, parseWeaponProficiency } from "@/lib/utils/battle/proficiency";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const byName = (n: string) => classes.find((c) => c.name === n)!.proficiencies;

const heavy = { id: "plate", name: "Plate", slot: ArtifactSlot.ARMOR, modifiers: [{ type: "armorCategory", value: "heavy" }, { type: "armorBase", value: "18" }] };

const withProf = (name: string, worn?: typeof heavy): BattleParticipant => {
  const p = makeParticipant({ id: "p" });

  const prof = byName(name);

  return {
    ...p,
    abilities: { ...p.abilities, damageModel: "5e", proficiencyBonus: 3, proficiencies: { armor: prof.armor, weapons: prof.weapons } },
    battleData: { ...p.battleData, ...(worn && { equippedArtifacts: [worn as never] }) },
  };
};

const sword: BattleAttack = { name: "Longsword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing", weaponCategory: "martial" };

describe("parse SRD-рядків", () => {
  it("броня", () => {
    expect(parseArmorProficiency(byName("Fighter").armor)).toEqual({ light: true, medium: true, heavy: true, shield: true });
    expect(parseArmorProficiency(byName("Cleric").armor)).toEqual({ light: true, medium: true, heavy: false, shield: true });
    expect(parseArmorProficiency(byName("Druid").armor)).toEqual({ light: true, medium: false, heavy: false, shield: true });
    expect(parseArmorProficiency(byName("Wizard").armor)).toEqual({ light: false, medium: false, heavy: false, shield: false });
  });

  it("зброя", () => {
    expect(parseWeaponProficiency(byName("Fighter").weapons)).toMatchObject({ simple: true, martial: true });
    expect(parseWeaponProficiency(byName("Wizard").weapons)).toMatchObject({ simple: true, martial: false });
    expect(parseWeaponProficiency(byName("Rogue").weapons)).toEqual({ simple: true, martial: false, martialTraits: ["finesse", "light"] });
    expect(parseWeaponProficiency(byName("Monk").weapons)).toEqual({ simple: true, martial: false, martialTraits: ["light"] });
  });
});

describe("володіння зброєю й бронею (5e)", () => {
  it("мартіал без володіння не дає бонус майстерності", () => {
    expect(calculateAttackBonus(withProf("Fighter"), sword) - calculateAttackBonus(withProf("Wizard"), sword)).toBe(3);
  });

  it("зброя без категорії (і HOMM-учасник) — як раніше", () => {
    const { weaponCategory: _c, ...plain } = sword;

    expect(isWeaponProficient(withProf("Wizard"), plain)).toBe(true);

    const homm = makeParticipant({ id: "h" });

    expect(calculateAttackBonus(homm, sword)).toBe(calculateAttackBonus(homm, plain));
  });

  it("мартіал із finesse/light доступний Rogue", () => {
    expect(isWeaponProficient(withProf("Rogue"), { ...sword, traits: ["finesse"] })).toBe(true);
    expect(isWeaponProficient(withProf("Rogue"), sword)).toBe(false);
  });

  it("важка броня без володіння: перешкода на Сил/Спр атаки й рятунки", () => {
    const wizard = withProf("Wizard", heavy);

    expect(armorPenalty(wizard)).toBe(true);
    expect(rollModeReasons(wizard, sword).disadvantage).toContainEqual(textRef("battleLog.rollMode.armorPenalty"));

    const save = (p: BattleParticipant, ability: "strength" | "wisdom") => rollSave({ target: p, ability, dc: 10, participants: [p], rng: () => 0.5 }).mode;

    expect(save(wizard, "strength")).toBe("disadvantage");
    expect(save(wizard, "wisdom")).toBe("normal");
  });

  it("з володінням або без броні — без штрафу", () => {
    expect(armorPenalty(withProf("Fighter", heavy))).toBe(false);
    expect(armorPenalty(withProf("Wizard"))).toBe(false);
    expect(armorPenalty(makeParticipant({ id: "h" }))).toBe(false);
  });
});
