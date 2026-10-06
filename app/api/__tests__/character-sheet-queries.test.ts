import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ calls: {} as Record<string, number>, artifacts: [] as unknown[], sets: [] as unknown[] }));

vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async () => {
          const key = `${name}.${method}`;

          db.calls[key] = (db.calls[key] ?? 0) + 1;

          if (key === "artifact.findMany") return db.artifacts;

          if (key === "artifactSet.findMany") return db.sets;

          return method === "findMany" ? [] : null;
        },
      },
    );

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { buildSheetFor } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler";

const armor = { id: "a1", campaignId: "c", name: "Кольчуга", slot: "armor", icon: null, rarity: "rare", description: null, bonuses: {}, modifiers: [], passiveAbility: null, abilities: null, setId: null };

const rage = { id: "r", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

const character = {
  id: "ch", campaignId: "c", type: "player", controlledBy: "u", name: "Ліра", level: 5, class: "Ranger", subclass: null, race: "Ельф", subrace: null, alignment: null,
  background: null, experience: 0, avatar: null, strength: 10, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 2, speed: 30,
  savingThrows: {}, skills: {},
  spellcastingAbility: null, spellSlots: {}, knownSpells: [], languages: [], proficiencies: {},
  skillTreeProgress: {}, seenLevel: null, createdAt: new Date(), updatedAt: new Date(), immunities: [], morale: 0,
  maxTargets: 1, minTargets: 1, personalSkillId: null, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null, goals: [],
  inventory: { id: "inv", characterId: "ch", equipped: { armor: "a1" }, backpack: [], gold: 0, silver: 0, copper: 0, items: [] },
};

describe("buildSheetFor", () => {
  beforeEach(() => {
    db.calls = {};
    db.artifacts = [armor];
    db.sets = [];
  });

  it("читає вдягнені артефакти з БД один раз", async () => {
    const sheet = await buildSheetFor(character as never, { isDM: false, isOwner: true });

    expect(sheet.items.artifacts.map((a) => a.name)).toEqual(["Кольчуга"]);
    expect(db.calls["artifact.findMany"]).toBe(1);
  });

  it("сети — з учасника; таблиця сетів читається один раз", async () => {
    db.artifacts = [{ ...armor, setId: "s1" }];
    db.sets = [{ id: "s1", name: "Мисливець", setBonus: null, icon: null, abilities: [rage] }];

    const sheet = await buildSheetFor(character as never, { isDM: false, isOwner: true });

    expect(sheet.items.sets).toEqual([{ setId: "s1", name: "Мисливець", have: 1, total: 1, complete: true, effects: [expect.stringMatching(/шкода \(ближня\) \+10%/)] }]);
    expect(db.calls["artifactSet.findMany"]).toBe(1);
  });
});
