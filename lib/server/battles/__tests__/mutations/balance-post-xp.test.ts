import { describe, expect, it, vi } from "vitest";

const DATA = vi.hoisted(() => {
  const hero = (id: string) => ({
    id, campaignId: "camp", type: "player", controlledBy: "u", name: id, level: 4, class: "Fighter", race: "Ельф",
    strength: 14, dexterity: 12, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 1, speed: 30,
    maxHp: 40, currentHp: 40, spellSlots: {}, knownSpells: [], skillTreeProgress: {}, personalSkillId: null, immunities: [], morale: 0,
    maxTargets: 1, minTargets: 1, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null,
    inventory: { id: `inv-${id}`, characterId: id, equipped: {} },
  });

  const unit = (id: string, cr: number | null) => ({
    id, campaignId: "camp", name: id, raceId: null, level: 2, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: 12, initiative: 0, speed: 30, maxHp: 20, proficiencyBonus: 2, attacks: [{ name: "Удар", attackBonus: 3, damageDice: "1d6", damageType: "slashing", type: "melee" }],
    knownSpells: [], avatar: null, immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
    cr, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [],
  });

  return { heroes: ["h1", "h2", "h3", "h4"].map(hero), units: [unit("wolf", 0.25), unit("ogre", 2), unit("homm", null)] };
});

vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method: string) => async () => {
        if (name === "character" && method === "findMany") return DATA.heroes;

        if (name === "unit" && method === "findMany") return DATA.units;

        if (name === "campaign") return { maxLevel: 20 };

        return method === "findMany" ? [] : null;
      },
    });

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { postBalanceResponse } from "@/lib/server/battles/balance/balance-post";
import { balanceSchema } from "@/lib/server/battles/balance/balance-schema";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const allies = { characterIds: ["h1", "h2", "h3", "h4"], units: [] };

const XP: Ruleset = { ...DEFAULT_RULES, encounters: { balance: "xp", edition: "2014", autoXp: false } };

describe("POST balance: режим xp", () => {
  it("середня складність для 4 героїв 4 рівня (ціль 1000): вовки ×8 = 400 × 2.5", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true }), XP);

    expect(res.suggestedEnemies).toEqual([{ unitId: "wolf", name: "wolf", quantity: 8, dpr: expect.any(Number), hp: 20, totalDpr: expect.any(Number), totalHp: 160, xp: 50 }]);
  });

  it("складність не з редакції → default; смертельна (ціль 2000, смуга до 3000) → огри ×3 = 1350 × 2", async () => {
    const wrong = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true, xpDifficulty: "low" }), XP);

    expect(wrong.suggestedEnemies?.[0]).toMatchObject({ unitId: "wolf", quantity: 8 });

    const deadly = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true, xpDifficulty: "deadly" }), XP);

    expect(deadly.suggestedEnemies?.[0]).toMatchObject({ unitId: "ogre", quantity: 3, xp: 450 });
    expect(deadly.suggestedEnemies?.[0]).not.toHaveProperty("hpMult");
  });

  it("режим fair — підбір як раніше, з множниками", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true }), DEFAULT_RULES);

    expect(res.suggestedEnemies?.every((e) => e.hpMult !== undefined)).toBe(true);
  });
});
