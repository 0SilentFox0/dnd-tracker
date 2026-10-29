import { describe, expect, it } from "vitest";

import { type ArmorStats, armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { hasShield, wornArmor, wornArmorCategory } from "@/lib/utils/artifacts/worn-armor";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { applyClassArmor, armorPenalties, classArmorBase, isClassModeHero } from "@/lib/utils/characters/classes/armor-class";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

const item = (artifactId: string, slot: string, modifiers: EquippedArtifact["modifiers"] = []): EquippedArtifact => ({ artifactId, name: artifactId, slot, bonuses: {}, modifiers });

const armorItem = (name: string, stats: ArmorStats) => ({ ...item(name, "armor", armorStatsColumns(stats).modifiers), name });

function hero(opts: { dex?: number; str?: number; items?: EquippedArtifact[] } = {}): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    abilities: { ...base.abilities, damageModel: "5e", strength: opts.str ?? 10, modifiers: { ...base.abilities.modifiers, dexterity: opts.dex ?? 0 } },
    battleData: { ...base.battleData, equippedArtifacts: opts.items ?? [] },
  };
}

const CHAIN = { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true } as const;

describe("worn armor", () => {
  it("reads the armor slot; HOMM armor without stats counts as none", () => {
    expect(wornArmorCategory(hero({ items: [armorItem("Chain Mail", CHAIN)] }))).toBe("heavy");
    expect(wornArmorCategory(hero({ items: [item("Кіраса Хаосу", "armor")] }))).toBe("none");
    expect(wornArmor(hero())).toBeNull();
  });

  it("a shield is the shield slot without weapon stats", () => {
    expect(hasShield(hero({ items: [item("Shield", "shield")] }))).toBe(true);
    expect(hasShield(hero({ items: [item("Dagger", "shield", weaponStatsColumns({ damageDice: "1d4", damageType: "piercing" }).modifiers)] }))).toBe(false);
    expect(hasShield(hero())).toBe(false);
  });
});

describe("classArmorBase", () => {
  it("no armor: 10 + Dex", () => {
    expect(classArmorBase(hero({ dex: 3 })).base).toBe(13);
    expect(classArmorBase(hero({ dex: -1 })).base).toBe(9);
    expect(classArmorBase(hero({ dex: 3 })).lines).toEqual([
      { label: "characterProfile.sheet.lines.noArmor", value: "10", source: "base" },
      { label: "gameTerms.abilities.dexterity.label", value: "+3", source: "ability" },
    ]);
  });

  it("light adds full Dex, medium caps at 2, heavy ignores Dex", () => {
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Leather Armor", { category: "light", base: 11 })] })).base).toBe(15);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Breastplate", { category: "medium", base: 14 })] })).base).toBe(16);
    expect(classArmorBase(hero({ dex: -1, items: [armorItem("Breastplate", { category: "medium", base: 14 })] })).base).toBe(13);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Chain Mail", CHAIN)] })).base).toBe(16);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Odd", { category: "medium", base: 14, dexCap: 3 })] })).base).toBe(17);
  });

  it("lines name the armor and the capped Dex", () => {
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Breastplate", { category: "medium", base: 14 })] })).lines).toEqual([
      { label: "Breastplate", value: "14", source: "artifact" },
      { label: "characterProfile.sheet.lines.dexterityCapped", params: { cap: 2 }, value: "+2", source: "ability" },
    ]);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Chain Mail", CHAIN)] })).lines).toEqual([{ label: "Chain Mail", value: "16", source: "artifact" }]);
  });
});

describe("armorPenalties / applyClassArmor", () => {
  it("stealth disadvantage and −10 speed below the strength requirement", () => {
    const p = armorPenalties(hero({ str: 12, items: [armorItem("Chain Mail", CHAIN)] }));

    expect(p).toMatchObject({ id: "armor-penalties", name: "Chain Mail", trigger: { event: "passive" }, source: { type: "artifact", id: "Chain Mail", name: "Chain Mail" }, key: "artifact:Chain Mail:armor-penalties" });
    expect(p?.effects).toEqual([{ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] }, { kind: "modifyStat", stat: "speed", flat: -10 }]);
    expect(armorPenalties(hero({ str: 13, items: [armorItem("Chain Mail", CHAIN)] }))?.effects).toEqual([{ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] }]);
    expect(armorPenalties(hero({ items: [armorItem("Leather Armor", { category: "light", base: 11 })] }))).toBeNull();
    expect(armorPenalties(hero())).toBeNull();
  });

  it("applyClassArmor writes AC, speed once and the penalty ability", () => {
    const out = applyClassArmor(hero({ str: 12, dex: 2, items: [armorItem("Chain Mail", CHAIN)] }));

    expect(out.combatStats.armorClass).toBe(16);
    expect(out.combatStats.speed).toBe(20);
    expect(out.battleData.resolvedAbilities.map((a) => a.id)).toEqual(["armor-penalties"]);
  });

  it("a shield ability stacks on top through collectModifiers", () => {
    const p = applyClassArmor(hero({ dex: 2, items: [item("Shield", "shield")] }));

    grantPassive(p, [{ kind: "modifyStat", stat: "armor", flat: 2 }], "Shield");

    expect(getEffectiveArmorClass(p)).toBe(14);
  });

  it("class-mode marker: a 5e character, not a 5e monster", () => {
    expect(isClassModeHero(hero())).toBe(true);
    expect(isClassModeHero(createMockParticipant())).toBe(false);
    expect(isClassModeHero({ ...hero(), basicInfo: { ...hero().basicInfo, sourceType: "unit" } })).toBe(false);
  });
});

describe("heavy armor ignores Dex entirely", () => {
  it("negative Dex does not lower heavy armor AC", () => {
    expect(classArmorBase(hero({ dex: -1, items: [armorItem("Chain Mail", CHAIN)] })).base).toBe(16);
  });
});
