import { describe, expect, it } from "vitest";

import { convertLegacyArtifact } from "../convert-artifact";
import { convertLegacyArtifactSet } from "../convert-artifact-set";
import { convertLegacyRace } from "../convert-race";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

describe("convertLegacyArtifact", () => {
  it("бонуси, модифікатори шкоди/атаки і пасивка з аурою", () => {
    const r = convertLegacyArtifact({
      id: "a1",
      name: "Прапор",
      slot: "item",
      bonuses: { strength: 2, armorClass: 1, slotBonus_3: 1 },
      modifiers: [{ type: "melee_damage", value: 10, isPercentage: true }, { type: "ranged_attack", value: 1 }],
      passiveAbility: { effectScope: { audience: "all_allies" }, effects: [{ stat: "physical_resistance", type: "percent", value: 10, isPercentage: true }] },
    });

    expect(r.abilities).toHaveLength(1);
    expect(r.abilities[0].trigger).toEqual({ event: "passive" });
    expect(r.abilities[0].effects).toEqual(
      expect.arrayContaining([
        { kind: "modifyStat", stat: "strength", flat: 2, target: "allAllies" },
        { kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" },
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [3], flat: 1, target: "allAllies" },
        { kind: "damageBonus", filter: { kind: "melee" }, percent: 10, target: "allAllies" },
        { kind: "modifyStat", stat: "attackBonus", attackKind: "ranged", flat: 1, target: "allAllies" },
        { kind: "flag", flag: "resistance", damageType: "physical", percent: 10, target: "allAllies" },
      ]),
    );
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });

  it("тригер start_of_battle → вміння battleStart з нотаткою", () => {
    const r = convertLegacyArtifact({ id: "h", name: "Ріг", slot: "item", bonuses: {}, modifiers: [], passiveAbility: { trigger: { type: "start_of_battle" }, effect: { type: "add_effect" } } });

    expect(r.abilities).toEqual([{ id: "start", name: "Ріг", trigger: { event: "battleStart" }, effects: [{ kind: "note", text: "Ріг" }] }]);
  });

  it("цілі зброї не дублюються (їх рахує атака)", () => {
    const r = convertLegacyArtifact({ id: "w", name: "Лук", slot: "weapon", bonuses: {}, modifiers: [{ type: "max_targets", value: 1 }], passiveAbility: null });

    expect(r.abilities).toEqual([]);
  });

  it("skipBakedStats: лише модифікатори шкоди/атаки і прапорці", () => {
    const r = convertLegacyArtifact(
      { id: "a1", name: "Меч", slot: "weapon", bonuses: { armorClass: 1 }, modifiers: [{ type: "melee_damage", value: 2 }], passiveAbility: { effects: [{ stat: "hp_bonus", type: "flat", value: 5 }] } },
      { skipBakedStats: true },
    );

    expect(r.abilities[0].effects).toEqual([{ kind: "damageBonus", filter: { kind: "melee" }, flat: 2 }]);
  });

  it("конвертер не рахує бонус атаки зброї втратою", () => {
    const r = convertLegacyArtifact({ id: "w", name: "Меч", slot: "weapon", bonuses: { attackBonus: 2 }, modifiers: [{ type: "damageDice", value: "1d8" }], passiveAbility: null } as never);

    expect(r.issues.filter((i) => /attackBonus/.test(i.message))).toEqual([]);
  });
});

describe("convertLegacyArtifactSet / Race", () => {
  it("сет: слоти, імунітет до спелів, аура на ворогів", () => {
    const r = convertLegacyArtifactSet({ id: "set", name: "Сет", setBonus: { spellSlotBonus: { "2": 1 }, effectScope: { audience: "all_enemies", immuneSpellIds: ["sp1"] }, modifiers: [{ type: "all_damage", value: -5, isPercentage: true }] } });

    expect(r.abilities[0].effects).toEqual(
      expect.arrayContaining([
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [2], flat: 1, target: "allEnemies" },
        { kind: "flag", flag: "spellImmunity", spellIds: ["sp1"], target: "allEnemies" },
        { kind: "damageBonus", filter: { kind: "all" }, percent: -5, target: "allEnemies" },
      ]),
    );
  });

  it("раса: цілі з passiveAbility, опис з «імунітет» → issue", () => {
    const r = convertLegacyRace({ id: "r", name: "Дракон", passiveAbility: { description: "Імунітет до вогню", max_targets: 1 } });

    expect(r.abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "maxTargets", flat: 1 }]);
    expect(r.issues[0].message).toContain("вручну");
  });
});
