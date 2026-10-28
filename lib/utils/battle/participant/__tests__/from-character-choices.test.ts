import { beforeEach, describe, expect, it, vi } from "vitest";

const getCachedFeats = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

vi.mock("@/lib/cache/reference-data", async (importOriginal) => ({ ...(await importOriginal<object>()), getCachedFeats }));

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { elf, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

const base = {
  id: "ch1", campaignId: "c1", name: "Лія", race: "Elf", class: "", level: 4,
  strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 16,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: ["sp-known"],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: null, classes: [], raceChoices: {}, feats: [], skills: {},
};

const elfRow = { id: elf.id, campaignId: "c1", name: "Elf", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], passiveAbility: null, abilities: [], choices: elf.choices };

const build = (character: object, rules = DEFAULT_RULES, race: object | null = elfRow) =>
  createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { Elf: race }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { [sorcerer.id]: sorcerer },
  } as never);

const featRow = { id: "f-alert", campaignId: "c1", name: "Alert", icon: null, type: "origin", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "alert", name: "Alert", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] }], choices: [] };

describe("participant from choices", () => {
  beforeEach(() => getCachedFeats.mockClear());

  it("HOMM hero (race without choices, no classes): no feat query, nothing added", async () => {
    const p = await build({}, DEFAULT_RULES, { ...elfRow, choices: [] });

    expect(getCachedFeats).not.toHaveBeenCalled();
    expect(p.spellcasting.knownSpells).toEqual(["sp-known"]);
    expect(p.battleData.resolvedAbilities.some((a) => a.key.includes("choice"))).toBe(false);
  });

  it("Wood Elf lineage: +5 speed, Druidcraft + Longstrider known at level 4, no class mode needed", async () => {
    const p = await build({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] } });

    expect(p.combatStats.speed).toBe(35);
    expect(p.spellcasting.knownSpells).toEqual(["sp-known", "sp-druidcraft", "sp-longstrider"]);
  });

  it("class mode: origin feat Alert adds proficiency to initiative; feats load once", async () => {
    getCachedFeats.mockResolvedValueOnce([featRow]);

    const rules = parseRules({ classes: { enabled: true } });

    const p = await build({ classes: [{ classId: sorcerer.id, level: 4 }], feats: [{ id: "f-alert", source: "origin" }] }, rules);

    expect(getCachedFeats).toHaveBeenCalledTimes(1);
    expect(p.abilities.initiative).toBe(p.abilities.baseInitiative);
    expect(p.battleData.resolvedAbilities.find((a) => a.source.type === "feat")?.source.name).toBe("Alert");
    expect(p.abilities.initiative - base.initiative).toBe(p.abilities.proficiencyBonus);
  });

  it("feats are ignored outside class mode", async () => {
    const p = await build({ feats: [{ id: "f-alert", source: "origin" }] });

    expect(p.battleData.resolvedAbilities.some((a) => a.source.type === "feat")).toBe(false);
  });
});
