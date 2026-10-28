import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCachedFeats = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

const getCachedBackgrounds = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

vi.mock("@/lib/cache/reference-data", async (importOriginal) => ({ ...(await importOriginal<object>()), getCachedFeats, getCachedBackgrounds }));

import { ParticipantSide } from "@/lib/constants/battle";
import * as backgroundRows from "@/lib/utils/backgrounds/row";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";
import { alert, elf, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import * as featRows from "@/lib/utils/feats/row";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BackgroundData } from "@/types/backgrounds";

const base = {
  id: "ch1", campaignId: "c1", name: "Лія", race: "Elf", class: "", level: 4,
  strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 16,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: ["sp-known"],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: null, classes: [], raceChoices: {}, feats: [], skills: {},
};

const elfRow = { id: elf.id, campaignId: "c1", name: "Elf", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], passiveAbility: null, abilities: [], choices: elf.choices };

const build = (character: object, rules = DEFAULT_RULES, race: object | null = elfRow, refs: Pick<CampaignSpellContext, "featsById" | "backgroundsById"> = {}) =>
  createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { Elf: race }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { [sorcerer.id]: sorcerer }, ...refs,
  } as never);

const featRow = { id: "f-alert", campaignId: "c1", name: "Alert", icon: null, type: "origin", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "alert", name: "Alert", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] }], choices: [] };

const background: BackgroundData = { id: "bg", name: "Scholar", icon: null, description: null, choices: [], skillProficiencies: ["arcana"], toolProficiencies: [], originFeatId: alert.id, equipmentText: null };

const backgroundRow = { ...background, campaignId: "c1" };

const choiceRefs = { featsById: { [alert.id]: alert }, backgroundsById: { [background.id]: background } };

const classRules = parseRules({ classes: { enabled: true } });

const classCharacter = { classes: [{ classId: sorcerer.id, level: 4 }], feats: [{ id: alert.id, source: "dm" }], backgroundId: background.id };

describe("participant from choices", () => {
  beforeEach(() => {
    getCachedFeats.mockReset().mockResolvedValue([]);
    getCachedBackgrounds.mockReset().mockResolvedValue([]);
    vi.spyOn(Date, "now").mockReturnValue(1793016000000);
  });

  afterEach(() => vi.restoreAllMocks());

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

  it("finite lineage spell grants become separate pools while staying known", async () => {
    const race = { ...elfRow, choices: [{ ...elf.choices[0], lineage: true as const, options: [{ ...elf.choices[0].options?.[0], spells: [{ level: 1, spellId: "sp-dancing", grant: { uses: 1, rest: "long" as const, castLevel: 1, via: "slotOrGrant" as const } }] }] }] };

    const p = await build({ raceChoices: { "elven-lineage": [{ id: "drow" }] } }, DEFAULT_RULES, race);

    expect(p.spellcasting.knownSpells).toContain("sp-dancing");
    expect(p.spellcasting.grants).toEqual([{ spellId: "sp-dancing", key: "race:race-elf:elven-lineage:drow:sp-dancing", label: "Лінія: Drow", via: "slotOrGrant", pool: "pool:grant:race:race-elf:elven-lineage:drow:sp-dancing", cost: 1, castLevel: 1 }]);
    expect(p.battleData.pools?.["pool:grant:race:race-elf:elven-lineage:drow:sp-dancing"]).toEqual({ label: "Лінія: Drow", max: 1, rest: "long" });
  });

  it("two breath shapes share one proficiency pool and use Constitution", async () => {
    const grant = { uses: "proficiency", rest: "long", dcAbility: "constitution", castLevel: 0, sharedPool: "breath" };

    const race = { ...elfRow, choices: [{ id: "ancestry", label: "Ancestry", kind: "option", level: 1, count: 1, options: [{ id: "red", name: "Red", abilities: [], spells: ["cone", "line"].map((spellId) => ({ level: 1, spellId, grant })) }] }] };

    const p = await build({ raceChoices: { ancestry: [{ id: "red" }] } }, DEFAULT_RULES, race);

    const grants = p.spellcasting.grants ?? [];

    expect(grants).toHaveLength(2);
    expect(grants[0].pool).toBe(grants[1].pool);
    expect(grants[0].key).not.toBe(grants[1].key);
    expect(grants[0]).toMatchObject({ dcAbility: "constitution", castLevel: 0 });
    expect(p.battleData.pools?.[grants[0].pool ?? ""]).toMatchObject({ max: p.abilities.proficiencyBonus, rest: "long" });
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

  it("preloadedChoiceRefsAvoidFallbackReads: explicit empty maps are authoritative", async () => {
    getCachedFeats.mockResolvedValue([featRow]);
    getCachedBackgrounds.mockResolvedValue([backgroundRow]);

    const p = await build(classCharacter, classRules, elfRow, { featsById: {}, backgroundsById: {} });

    expect(getCachedFeats).not.toHaveBeenCalled();
    expect(getCachedBackgrounds).not.toHaveBeenCalled();
    expect(p.battleData.resolvedAbilities.some((a) => a.source.type === "feat")).toBe(false);
    expect(p.battleData.resolvedAbilities.some((a) => a.key.includes("choices"))).toBe(false);
  });

  it("undefined refs keep campaign-scoped fallback; preloaded refs produce the same entire participant", async () => {
    getCachedFeats.mockResolvedValue([featRow]);
    getCachedBackgrounds.mockResolvedValue([backgroundRow]);

    const fallback = await build(classCharacter, classRules);

    expect(getCachedFeats).toHaveBeenCalledExactlyOnceWith("c1");
    expect(getCachedBackgrounds).toHaveBeenCalledExactlyOnceWith("c1");
    expect(fallback.battleData.resolvedAbilities.filter((a) => a.source.type === "feat").map((a) => a.source.name)).toEqual(["Alert", "Alert"]);

    getCachedFeats.mockClear();
    getCachedBackgrounds.mockClear();

    const preloaded = await build(classCharacter, classRules, elfRow, choiceRefs);

    expect(preloaded).toEqual(fallback);
    expect(getCachedFeats).not.toHaveBeenCalled();
    expect(getCachedBackgrounds).not.toHaveBeenCalled();
  });

  it("missing background in a preloaded map resolves to null without consulting fallback", async () => {
    getCachedBackgrounds.mockResolvedValue([backgroundRow]);

    const p = await build(classCharacter, classRules, elfRow, { featsById: { [featRow.id]: alert }, backgroundsById: { other: { ...background, id: "other" } } });

    expect(getCachedBackgrounds).not.toHaveBeenCalled();
    expect(p.battleData.resolvedAbilities.filter((a) => a.source.type === "feat")).toHaveLength(1);
    expect(p.battleData.resolvedAbilities.some((a) => a.key.includes("choice-skills"))).toBe(false);
  });

  it.each([2, 20])("%i heroes reuse one set of preloaded refs without loader calls", async (count) => {
    const featMapping = vi.spyOn(featRows, "toFeatData");

    const backgroundMapping = vi.spyOn(backgroundRows, "toBackgroundData");

    getCachedFeats.mockResolvedValue([featRow]);
    getCachedBackgrounds.mockResolvedValue([backgroundRow]);

    const fallback = [];

    for (let i = 0; i < count; i++) fallback.push(await build({ ...classCharacter, id: `hero-${i}` }, classRules));

    expect(getCachedFeats).toHaveBeenCalledTimes(count);
    expect(getCachedBackgrounds).toHaveBeenCalledTimes(count);
    expect(featMapping).toHaveBeenCalledTimes(count);
    expect(backgroundMapping).toHaveBeenCalledTimes(count);
    getCachedFeats.mockClear();
    getCachedBackgrounds.mockClear();
    featMapping.mockClear();
    backgroundMapping.mockClear();

    const preloaded = [];

    for (let i = 0; i < count; i++) preloaded.push(await build({ ...classCharacter, id: `hero-${i}` }, classRules, elfRow, choiceRefs));

    expect(preloaded).toEqual(fallback);
    expect(getCachedFeats).not.toHaveBeenCalled();
    expect(getCachedBackgrounds).not.toHaveBeenCalled();
    expect(featMapping).not.toHaveBeenCalled();
    expect(backgroundMapping).not.toHaveBeenCalled();
  });

  it("does not reuse another campaign's refs across builds", async () => {
    await build(classCharacter, classRules, elfRow, choiceRefs);
    getCachedFeats.mockResolvedValue([{ ...featRow, campaignId: "c2", name: "Other campaign feat" }]);
    getCachedBackgrounds.mockResolvedValue([]);

    const p = await build({ ...classCharacter, campaignId: "c2" }, classRules);

    expect(getCachedFeats).toHaveBeenCalledExactlyOnceWith("c2");
    expect(getCachedBackgrounds).toHaveBeenCalledExactlyOnceWith("c2");
    expect(p.battleData.resolvedAbilities.filter((a) => a.source.type === "feat").map((a) => a.source.name)).toEqual(["Other campaign feat"]);
  });
});
