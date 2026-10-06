import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTreeJson } from "@/lib/utils/skills/progression";

const db = vi.hoisted(() => ({ calls: {} as Record<string, number>, results: {} as Record<string, unknown> }));

vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async () => {
          const key = `${name}.${method}`;

          db.calls[key] = (db.calls[key] ?? 0) + 1;

          return key in db.results ? db.results[key] : method === "findMany" ? [] : null;
        },
      },
    );

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { buildSheetFor, loadSheetCharacter } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler";

const rage = { id: "r", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

const armor = { id: "a1", campaignId: "c", name: "Кольчуга", slot: "armor", icon: null, rarity: "rare", description: null, bonuses: {}, modifiers: [], abilities: [], setId: null, artifactSet: null };

const huntSet = { id: "s1", campaignId: "c", name: "Мисливець", setBonus: null, icon: null, abilities: [rage], artifacts: [{ id: "a1" }] };

const tree = {
  id: "row-tree",
  campaignId: "c",
  race: "Ельф",
  skills: buildTreeJson({ id: "json-tree", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "atk-b" }, outer: ["o1"], middle: [], inner: [] }] }),
};

const skill = (id: string) => ({ id, campaignId: "c", name: id, icon: null, description: `опис ${id}`, abilities: [], spellGroupId: null, spellNewSpellId: null, mainSkillId: null });

const character = {
  id: "ch", campaignId: "c", type: "player", controlledBy: "u", name: "Ліра", level: 5, class: "Ranger", subclass: null, race: "Ельф", subrace: null, alignment: null,
  background: null, experience: 0, avatar: null, strength: 10, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 2, speed: 30,
  savingThrows: {}, skills: {},
  spellcastingAbility: "wisdom", spellSlots: {}, knownSpells: ["sp1"], languages: [], proficiencies: {},
  skillTreeProgress: { "row-tree": { unlockedSkills: ["attack_basic_level", "o1"] } }, seenLevel: 3, createdAt: new Date(), updatedAt: new Date(), immunities: [], morale: 0,
  maxTargets: 1, minTargets: 1, personalSkillId: "p1", hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null, goals: [],
  inventory: { id: "inv", characterId: "ch", equipped: { armor: "a1" }, backpack: [], gold: 0, silver: 0, copper: 0, items: [] },
};

const bookSpell = { id: "sp1", name: "Іскра", level: 1, type: "target", damageType: "damage", diceCount: 1, diceType: "d6", savingThrow: null, hitCheck: true, description: "", icon: null, range: null, duration: null, concentration: false, damageElement: null, spellGroup: null };

const total = () => Object.values(db.calls).reduce((a, b) => a + b, 0);

describe("лист персонажа: запити до БД", () => {
  beforeEach(() => {
    db.calls = {};
    db.results = {
      "character.findUnique": character,
      "campaign.findUnique": { races: [{ id: "race", name: "Ельф", icon: "elf.png", passiveAbility: null, spellSlotProgression: [], abilities: [] }], skillTrees: [tree], mainSkills: [], spells: [{ id: "sp1", level: 1, groupId: null }] },
      "artifact.findMany": [armor],
      "skill.findMany": [skill("atk-b"), skill("o1"), skill("p1")],
      "spell.findMany": [bookSpell],
    };
  });

  it("персонаж із деревом, артефактами, особистим скілом і заклинаннями — не більше 5 викликів Prisma", async () => {
    const loaded = await loadSheetCharacter("ch");

    const sheet = await buildSheetFor(loaded as never, { isDM: false, isOwner: true }, 20);

    expect(total()).toBeLessThanOrEqual(5);
    expect(db.calls["race.findFirst"]).toBeUndefined();
    expect(db.calls["skillTree.findFirst"]).toBeUndefined();
    expect(db.calls["skill.findMany"]).toBe(1);
    expect(sheet.identity.raceIcon).toBe("elf.png");
    expect(sheet.personalSkill).toEqual({ id: "p1", name: "p1", icon: null, description: "опис p1" });
    expect(sheet.spells.map((s) => s.id)).toEqual(["sp1"]);
    expect(sheet.items.artifacts.map((a) => a.name)).toEqual(["Кольчуга"]);
  });

  it("сети приходять разом з артефактами, без окремих запитів", async () => {
    db.results["artifact.findMany"] = [{ ...armor, setId: "s1", artifactSet: huntSet }];

    const sheet = await buildSheetFor(character as never, { isDM: false, isOwner: true }, 20);

    expect(sheet.items.sets).toEqual([{ setId: "s1", name: "Мисливець", have: 1, total: 1, complete: true, effects: [expect.stringMatching(/шкода \(ближня\) \+10%/)] }]);
    expect(db.calls["artifactSet.findMany"]).toBeUndefined();
    expect(db.calls["artifact.findMany"]).toBe(1);
  });

  it("прогресія в листі: вільні очки = рівень − вивчені вузли дерева", async () => {
    const sheet = await buildSheetFor(character as never, { isDM: false, isOwner: true }, 20);

    expect(sheet.progression).toEqual({ freePoints: 3, level: 5, seenLevel: 3 });
  });

  it("без дерева раси — 0 вільних очок", async () => {
    db.results["campaign.findUnique"] = { races: [], skillTrees: [], mainSkills: [], spells: [] };

    const sheet = await buildSheetFor(character as never, { isDM: false, isOwner: true }, 20);

    expect(sheet.progression.freePoints).toBe(0);
  });
});
