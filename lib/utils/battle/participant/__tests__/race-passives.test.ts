import { describe, expect, it } from "vitest";

import { createBattleParticipantFromCharacter } from "../from-character";

import { RACES } from "@/data/library/races";
import { ParticipantSide } from "@/lib/constants/battle";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { immuneTo } from "@/lib/utils/abilities/registry/effects/state";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { applyResistance, hasImmunity } from "@/lib/utils/battle/resistance";
import { racePassiveData } from "@/scripts/seed-library-lib";
import type { BattleParticipant } from "@/types/battle";

const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

function raceRow(key: string | null) {
  const race = RACES.find((r) => r.key === key);

  const data = race ? racePassiveData(race) : { passiveAbility: null, abilities: [] };

  return { id: `race-${key}`, campaignId: "c1", name: race?.name ?? "Без раси", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], ...data };
}

function character(raceName: string, morale = 0) {
  return {
    id: "ch1",
    campaignId: "c1",
    name: "Герой",
    race: raceName,
    class: "Воїн",
    level: 5,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 12,
    speed: 30,
    initiative: 0,
    morale,
    controlledBy: "u1",
    immunities: [],
    knownSpells: [],
    equipment: {},
    skillTreeProgress: {},
    personalSkillId: null,
  };
}

const context = (race: ReturnType<typeof raceRow>) =>
  ({
    skillTreeByRace: {},
    mainSkills: [],
    spells: [],
    allSkills: [],
    racesByName: { [race.name]: race },
    campaign: { maxLevel: 20 },
    skillsById: {},
    artifactsById: {},
    artifactSetsById: {},
    artifactSetMemberIds: {},
  }) as never;

async function build(raceKey: string | null, morale = 0): Promise<BattleParticipant> {
  const race = raceRow(raceKey);

  return createBattleParticipantFromCharacter(character(race.name, morale) as never, "b1", ParticipantSide.ALLY, undefined, context(race));
}

describe("race innate passives reach the battle participant", () => {
  it("stat bonuses are baked into the participant abilities", async () => {
    for (const race of RACES) {
      const base = await build(null);

      const p = await build(race.key);

      for (const key of ABILITY_KEYS) {
        expect(p.abilities[key] - base.abilities[key], `${race.key} ${key}`).toBe(race.passive.stats[key] ?? 0);
      }

      expect(p.battleData.resolvedAbilities?.some((a) => a.id === `${race.key}-stats`), race.key).toBe(true);
    }
  });

  it("Гноми: +1 AC", async () => {
    const base = await build(null);

    const dwarf = await build("dwarves");

    expect(statWithModifiers([dwarf], dwarf.basicInfo.id, "armor", dwarf.combatStats.armorClass)).toBe(statWithModifiers([base], base.basicInfo.id, "armor", base.combatStats.armorClass) + 1);
  });

  it("Ельфи: +1 to ranged attack bonus only", async () => {
    const elf = await build("elves");

    const id = elf.basicInfo.id;

    expect(collectModifiers([elf], id, { stat: "attackBonus", attackKind: "ranged" }).flat).toBe(1);
    expect(collectModifiers([elf], id, { stat: "attackBonus", attackKind: "melee" }).flat).toBe(0);
  });

  it("Демони: fire resistance 50 % in a damage calculation", async () => {
    const demon = await build("demons");

    expect(applyResistance(demon, 20, "fire").finalDamage).toBe(10);
    expect(applyResistance(demon, 20, "cold").finalDamage).toBe(20);
  });

  it("Некроманти: immune to poison and fear", async () => {
    const necro = await build("necromancers");

    expect(hasImmunity(necro, "poison")).toBe(true);
    expect(applyResistance(necro, 20, "poison").finalDamage).toBe(0);
    expect(immuneTo([necro], necro.basicInfo.id, "fear")).toBe(true);
    expect(immuneTo([necro], necro.basicInfo.id, "charm")).toBe(false);

    const human = await build("humans");

    expect(hasImmunity(human, "poison")).toBe(false);
  });

  it("Люди: morale never below 0", async () => {
    const human = await build("humans", -2);

    const dwarf = await build("dwarves", -2);

    expect(effectiveMorale(human, [human]).value).toBe(0);
    expect(effectiveMorale(dwarf, [dwarf]).value).toBe(-2);
  });

  it("Маги: +1 slot of level 1", async () => {
    const base = await build(null);

    const mage = await build("mages");

    const slots = (p: BattleParticipant) => p.spellcasting.spellSlots["1"] ?? { max: 0, current: 0 };

    expect(slots(mage).max - slots(base).max).toBe(1);
    expect(slots(mage).current - slots(base).current).toBe(1);
    expect(mage.spellcasting.spellSlots["2"]).toEqual(base.spellcasting.spellSlots["2"]);
  });

  it("Темні ельфи: advantage on the first attack of the battle only", async () => {
    const elf = await build("dark-elves");

    const foe = { ...(await build(null)), basicInfo: { ...(await build(null)).basicInfo, id: "foe", side: ParticipantSide.ENEMY } };

    const event = { type: "attack", phase: "before", actorId: elf.basicInfo.id, targetId: "foe", attackKind: "melee" } as const;

    const first = runAbilities([elf, foe], event, { round: 1, rng: seq(0.5) });

    expect(first.actionModifiers[elf.basicInfo.id]).toEqual([{ kind: "flag", flag: "advantage", attackKind: "all" }]);

    const second = runAbilities(first.participants, event, { round: 1, rng: seq(0.5) });

    expect(second.actionModifiers[elf.basicInfo.id]).toBeUndefined();
  });
});
