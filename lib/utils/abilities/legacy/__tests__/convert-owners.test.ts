import { describe, expect, it } from "vitest";

import { convertLegacyArtifact } from "@/lib/utils/abilities/legacy/convert-artifact";
import { convertLegacyArtifactSet } from "@/lib/utils/abilities/legacy/convert-artifact-set";
import { convertLegacyRace } from "@/lib/utils/abilities/legacy/convert-race";
import { convertLegacySnapshot } from "@/lib/utils/abilities/legacy/convert-snapshot";
import { convertLegacyUnit } from "@/lib/utils/abilities/legacy/convert-unit";
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
});

describe("convertLegacyArtifactSet / Race / Unit", () => {
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

  it("юніт: пасивні нотатки і бонусна дія", () => {
    const r = convertLegacyUnit({ id: "u", name: "Шаман", specialAbilities: [{ name: "Тотем", description: "Ставить тотем", type: "active", actionType: "bonus_action", spellId: "sp" }, { name: "Шкіра", type: "passive" }] });

    expect(r.abilities.map((a) => a.trigger.event)).toEqual(["bonusAction", "passive"]);
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });
});

describe("convertLegacySnapshot", () => {
  it("activeSkills + artifacts → resolvedAbilities без запечених статів; usage з skillUsageCounts", () => {
    const r = convertLegacySnapshot({
      activeSkills: [
        { skillId: "s1", name: "Напад — Базовий", mainSkillId: "m", level: "basic", effects: [{ stat: "melee_damage", type: "percent", value: 10, isPercentage: true }], skillTriggers: [{ type: "simple", trigger: "passive" }] },
        { skillId: "s2", name: "Напад — Експерт", mainSkillId: "m", level: "expert", effects: [{ stat: "melee_damage", type: "percent", value: 30, isPercentage: true }], skillTriggers: [{ type: "simple", trigger: "passive" }] },
        { skillId: "s3", name: "Шип", mainSkillId: "m", level: "basic", effects: [{ stat: "survive_lethal", type: "flag", value: true, isPercentage: false }], skillTriggers: [{ type: "simple", trigger: "onLethalDamage", modifiers: { oncePerBattle: true } }], spellEnhancements: { spellEffectIncrease: 25 }, spellGroupId: "g" },
      ],
      racialAbilities: [],
      equippedArtifacts: [{ artifactId: "a", name: "Меч", slot: "weapon", bonuses: { armorClass: 2 }, modifiers: [{ type: "melee_damage", value: 3 }] }],
      skillUsageCounts: { s3: 1 },
    });

    const keys = r.resolvedAbilities.map((a) => a.key);

    expect(keys).toEqual(expect.arrayContaining(["skill:s2:t0", "skill:s3:t0", "artifact:a:bonuses"]));
    expect(keys).not.toContain("skill:s1:t0");
    expect(r.abilityUsage["skill:s3:t0"]).toEqual({ battle: 1, round: 0, turn: 0 });
    expect(r.spellEnhancers).toEqual([expect.objectContaining({ skillId: "s3", spellGroupId: "g", spellEnhancements: { spellEffectIncrease: 25 } })]);
  });
});
