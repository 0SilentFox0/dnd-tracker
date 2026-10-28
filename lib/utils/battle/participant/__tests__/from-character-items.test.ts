import { describe, expect, it, vi } from "vitest";

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
  ring: art("ring", "Ring of Protection", "ring", { unique: false, charges: { max: 3, rest: "long" }, spells: [{ spellId: "sp-item", cost: 1, castLevel: 1, upcast: { maxLevel: 3, extraCost: 1 } }] }, { abilities: [NOTE("ring-note")] }),
  scroll: art("scroll", "Scroll", "item", { unique: false, consumable: true, spells: [{ spellId: "sp-scroll", cost: 1, castLevel: 3, dc: 15 }] }),
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

  it("active item spell grants share the item's charges and are absent when inactive", async () => {
    const active = await build(items, { equipped: {}, stash: ["ring"], attuned: [], items: [] });

    expect(active.abilities.creatureType).toBe("humanoid");
    expect(active.spellcasting.knownSpells).toContain("sp-item");
    expect(active.spellcasting.slotSpells).not.toContain("sp-item");
    expect(active.spellcasting.grants).toContainEqual({ spellId: "sp-item", key: "item:ring:spell:sp-item", label: "Ring of Protection", pool: "pool:item:ring", cost: 1, castLevel: 1, upcast: { maxLevel: 3, extraCost: 1 } });
    expect(active.battleData.pools?.["pool:item:ring"]).toEqual({ label: "Ring of Protection", max: 3, rest: "long" });

    const inactive = await build(DEFAULT_RULES, { equipped: {}, stash: ["ring"], attuned: [], items: [] });

    expect(inactive.spellcasting.grants ?? []).toHaveLength(0);
  });

  it("a scroll grants only its stored spell with its own nonrestoring stack pool", async () => {
    const p = await build(items, { equipped: {}, stash: [], attuned: [], items: [{ id: "scroll-stack", name: "Scroll", quantity: 2, consumable: true, artifactId: "scroll", spellId: "sp-scroll" }] });

    expect(p.spellcasting.grants).toContainEqual({ spellId: "sp-scroll", key: "consumable:scroll-stack:spell:sp-scroll", label: "Scroll", pool: "pool:consumable:scroll-stack", cost: 1, castLevel: 3, dc: 15 });
    expect(p.spellcasting.knownSpells).toContain("sp-scroll");
    expect(p.battleData.pools?.["pool:consumable:scroll-stack"]).toEqual({ label: "Scroll", max: 2, rest: null });
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

  it("frozen complete participant keeps grant order, stable keys and persisted pools", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1793016000000);

    try {
      const race = {
        id: "race:dragon/one", name: "Людина", choices: [{
          id: "gift", label: "Gift", kind: "option", level: 1, count: 1,
          options: [{
            id: "fire", name: "Fire", abilities: [],
            spells: [
              { level: 1, spellId: "cone", grant: { uses: "proficiency", rest: "long", sharedPool: "breath / fire", dcAbility: "constitution", castLevel: 0 } },
              { level: 1, spellId: "line", grant: { uses: "proficiency", rest: "long", sharedPool: "breath / fire", dcAbility: "constitution", castLevel: 0 } },
              { level: 1, spellId: "free", grant: { uses: 0, rest: "short", via: "slotOrGrant" } },
            ],
          }],
        }],
      };

      const ring = art("ring", "Charged Ring", "ring", {
        unique: false, charges: { max: 5, rest: "long" },
        spells: [
          { spellId: "sp-item", cost: 2, castLevel: 1, dc: 16, attackBonus: 6, upcast: { maxLevel: 4, extraCost: 2 } },
          { spellId: "free", cost: 0, castLevel: 0, dc: 1, attackBonus: 0 },
        ],
      });

      const scroll = art("scroll", "Scroll", "item", {
        unique: false, consumable: true,
        spells: [{ spellId: "unselected", cost: 1 }, { spellId: "sp-scroll", cost: 1, castLevel: 3, dc: 15, attackBonus: 5 }],
      });

      const classesById = {
        item: { ...fighter, id: "item", columns: [{ key: "ring", label: "Class pool", values: Array(20).fill("9"), pool: { rest: "short" } }] },
        fighter: { ...fighter, columns: [{ key: "energy", label: "Energy", values: Array(20).fill("3"), pool: { rest: "short" } }] },
      };

      const grantPool = "pool:grant:race:race%3Adragon%2Fone:gift:fire:shared:breath%20%2F%20fire";

      const p = await createBattleParticipantFromCharacter({
        ...base, knownSpells: ["sp-known", "sp-item", "sp-known"],
        classes: [{ classId: "item", level: 2 }, { classId: "fighter", level: 3 }],
        raceChoices: { gift: [{ id: "fire" }] },
        inventory: {
          equipped: { ring1: "ring", ring2: "ring" }, stash: [], attuned: [],
          items: [{ id: "scroll-stack", name: "Chosen scroll", quantity: 2, consumable: true, artifactId: "scroll", spellId: "sp-scroll" }],
        },
        resources: { hp: 7, tempHp: 2, charges: { "pool:item:ring": { used: 2, rest: "long" }, [grantPool]: { used: 1, rest: "long" }, "pool:fighter:energy": { used: 1, rest: "short" } } },
      } as never, "b1", ParticipantSide.ALLY, 2, {
        skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": race },
        campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: { ring, scroll }, artifactSetsById: {}, artifactSetMemberIds: {},
        rules: parseRules({ classes: { enabled: true }, items: { enabled: true }, outOfCombat: { persistResources: true } }),
        classesById, featsById: {}, backgroundsById: {},
      } as never);

      expect(p.spellcasting.knownSpells).toEqual(["sp-known", "sp-item", "cone", "line", "free", "sp-scroll"]);
      expect(p.spellcasting.grants).toHaveLength(6);
      expect(p.spellcasting.grants?.[2]).toEqual({ spellId: "free", key: "race:race%3Adragon%2Fone:gift:fire:free", label: "Людина: Fire", via: "slotOrGrant" });
      expect(p.battleData.pools?.[grantPool]).toEqual({ label: "Людина: Fire", max: 3, rest: "long" });
      expect(p.battleData.pools?.["pool:item:ring"]).toEqual({ label: "Charged Ring", max: 5, rest: "long" });
      expect(p.battleData.abilityUsage?.[grantPool]?.battle).toBe(1);
      expect(p.combatStats.currentHp).toBe(7);
      expect(p).toMatchSnapshot();
    } finally {
      clock.mockRestore();
    }
  });
});
