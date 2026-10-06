import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ artifactFindMany: 0 }));

vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async () => {
          if (name === "artifact" && method === "findMany") {
            calls.artifactFindMany += 1;

            return [{ id: "a1", campaignId: "c", name: "Кольчуга", slot: "armor", icon: null, rarity: "rare", description: null, bonuses: {}, modifiers: [], passiveAbility: null, abilities: null, setId: null }];
          }

          return method === "findMany" ? [] : null;
        },
      },
    );

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { buildSheetFor } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler";

const character = {
  id: "ch", campaignId: "c", type: "player", controlledBy: "u", name: "Ліра", level: 5, class: "Ranger", subclass: null, race: "Ельф", subrace: null, alignment: null,
  background: null, experience: 0, avatar: null, strength: 10, dexterity: 16, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 2, speed: 30,
  maxHp: 10, currentHp: 10, tempHp: 0, hitDice: "1d8", proficiencyBonus: 2, savingThrows: {}, skills: {}, passivePerception: 10, passiveInvestigation: 10, passiveInsight: 10,
  spellcastingClass: null, spellcastingAbility: null, spellSaveDC: null, spellAttackBonus: null, spellSlots: {}, knownSpells: [], languages: [], proficiencies: {},
  personalityTraits: null, ideals: null, bonds: null, flaws: null, skillTreeProgress: {}, seenLevel: null, createdAt: new Date(), updatedAt: new Date(), immunities: [], morale: 0,
  maxTargets: 1, minTargets: 1, personalSkillId: null, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null, goals: [],
  inventory: { id: "inv", characterId: "ch", equipped: { armor: "a1" }, backpack: [], gold: 0, silver: 0, copper: 0, items: [] },
};

describe("buildSheetFor", () => {
  it("читає вдягнені артефакти з БД один раз", async () => {
    const sheet = await buildSheetFor(character as never, { isDM: false, isOwner: true });

    expect(sheet.items.artifacts.map((a) => a.name)).toEqual(["Кольчуга"]);
    expect(calls.artifactFindMany).toBe(1);
  });
});
