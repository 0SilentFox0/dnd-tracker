import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const NOTE = (id: string) => ({ id, name: id, trigger: { event: "passive" }, effects: [{ kind: "note", text: id }] });

const art = (id: string, name: string, slot: string, item?: ItemStats, extra: { abilities?: unknown[]; weapon?: Parameters<typeof weaponStatsColumns>[0] } = {}) => {
  const cols = extra.weapon ? weaponStatsColumns(extra.weapon) : { bonuses: {}, modifiers: [] };

  return { id, campaignId: "c1", name, slot, setId: null, icon: null, rarity: "rare", description: null, bonuses: cols.bonuses, modifiers: [...cols.modifiers, ...(item ? itemStatsColumns(item).modifiers : [])], abilities: extra.abilities ?? [] };
};

const ROWS = {
  ls: art("ls", "Longsword", "weapon", { unique: false }, { weapon: { damageDice: "1d8" } }),
  ft: art("ft", "Flame Tongue", "weapon", { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }, { abilities: [{ id: "rider", name: "Flame", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "note", text: "fire" }] }] }),
  dg: art("dg", "Dagger", "weapon", { unique: false }, { weapon: { damageDice: "1d4", traits: ["light"] }, abilities: [NOTE("dagger-note")] }),
  ring: art("ring", "Ring of Protection", "ring", { unique: false }, { abilities: [NOTE("ring-note")] }),
  homm: art("homm", "Шолом", "helmet", undefined, { abilities: [NOTE("homm-note")] }),
};

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 5,
  strength: 12, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const fighter: GameClassData = {
  id: "fighter", name: "Fighter", icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [],
};

const build = (rules: Ruleset, inventory: object, character: object = {}) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: ROWS, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { fighter },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, ...character, inventory } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const items = parseRules({ items: { enabled: true }, classes: { enabled: true } });

const keys = (p: Awaited<ReturnType<typeof build>>) => p.battleData.resolvedAbilities.map((a) => a.key);

describe("battle participant: item refs", () => {
  it("attuned Flame Tongue Longsword: composed attack and prefixed rider from the ref", async () => {
    const p = await build(items, { equipped: { weapon: "ls+ft" }, stash: [], attuned: ["ls+ft"], items: [] });

    expect(p.battleData.attacks.find((a) => a.id === "ls+ft")?.name).toBe("Flame Tongue Longsword");
    expect(keys(p)).toContain("artifact:ls+ft:p-rider");
    expect(p.battleData.equippedArtifacts.map((e) => e.artifactId)).toEqual(["ls+ft"]);
  });

  it("unattuned: no rider", async () => {
    const p = await build(items, { equipped: { weapon: "ls+ft" }, stash: [], attuned: [], items: [] });

    expect(keys(p)).not.toContain("artifact:ls+ft:p-rider");
  });

  it("two identical daggers do not double their abilities", async () => {
    const p = await build(items, { equipped: { weapon: "dg", shield: "dg" }, stash: [], attuned: [], items: [] }, { classes: [{ classId: "fighter", level: 5 }] });

    expect(keys(p).filter((k) => k === "artifact:dg:dagger-note")).toHaveLength(1);
    expect(p.battleData.attacks.filter((a) => a.name === "Dagger").map((a) => a.id)).toEqual(["dg", "dg:off"]);
  });

  it("ring in the stash is carried only with items enabled", async () => {
    const inventory = { equipped: {}, stash: ["ring"], attuned: [], items: [] };

    expect(keys(await build(items, inventory))).toContain("artifact:ring:ring-note");
    expect(keys(await build(DEFAULT_RULES, inventory))).not.toContain("artifact:ring:ring-note");
  });

  it("HOMM: unique artifact as before, no pools key", async () => {
    const p = await build(DEFAULT_RULES, { equipped: { helmet: "homm" }, stash: [] });

    expect(keys(p)).toContain("artifact:homm:homm-note");
    expect(p.battleData).not.toHaveProperty("pools");
  });

  it("loadEquippedArtifactRows marks carried rows", async () => {
    const rows = await loadEquippedArtifactRows({ campaignId: "c1", inventory: { equipped: { helmet: "homm" }, stash: ["ring"] } } as never, ROWS as never, { rules: items });

    expect(rows.map((r) => [r.row.id, r.slot, r.carried ?? false])).toEqual([
      ["homm", "helmet", false],
      ["ring", "ring", true],
    ]);
  });
});
