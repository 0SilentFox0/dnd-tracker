import { describe, expect, it, vi } from "vitest";

const DATA = vi.hoisted(() => {
  const hero = (id: string) => ({
    id, campaignId: "camp", type: "player", controlledBy: "u", name: id, level: 4, class: "Fighter", race: "Ельф",
    strength: 14, dexterity: 12, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 1, speed: 30,
    maxHp: 40, currentHp: 40, spellSlots: {}, knownSpells: [], skillTreeProgress: {}, personalSkillId: null, immunities: [], morale: 0,
    maxTargets: 1, minTargets: 1, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null,
    inventory: { id: `inv-${id}`, characterId: id, equipped: {} },
  });

  const unit = (id: string, level: number, maxHp: number, dice: string) => ({
    id, campaignId: "camp", name: id, raceId: null, level, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: 12, initiative: 0, speed: 30, maxHp, proficiencyBonus: 2, attacks: [{ name: "Удар", attackBonus: 3, damageDice: dice, damageType: "slashing", type: "melee" }],
    knownSpells: [], avatar: null, immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
  });

  return { heroes: ["h1", "h2", "h3", "h4"].map(hero), units: [unit("rat", 1, 6, "1d4"), unit("wolf", 2, 40, "2d6"), unit("orc", 3, 60, "2d8"), unit("ogre", 4, 110, "3d10")] };
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

import { postBalanceResponse } from "@/app/api/campaigns/[id]/battles/balance/balance-post";
import { balanceSchema } from "@/app/api/campaigns/[id]/battles/balance/balance-schema";

const allies = { characterIds: ["h1", "h2", "h3", "h4"], units: [] };

describe("POST balance", () => {
  it("схема не має складності", () => {
    expect(Object.keys(balanceSchema.shape)).not.toContain("difficulty");
  });

  it("без suggest — лише сила союзників", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies }));

    expect(res.allyStats.allyCount).toBe(4);
    expect(res.suggestedEnemies).toBeUndefined();
  });

  it("suggest: склад із множниками, кількість у [N/2, 2N]", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true }));

    const total = (res.suggestedEnemies ?? []).reduce((a, e) => a + e.quantity, 0);

    expect(total).toBeGreaterThanOrEqual(2);
    expect(total).toBeLessThanOrEqual(8);
    expect(res.suggestedEnemies?.every((e) => (e.hpMult ?? 0) > 0 && (e.dmgMult ?? 0) > 0)).toBe(true);
  });

  it("схема обмежує розмір партії", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `c${i}`);

    expect(balanceSchema.safeParse({ allyParticipants: { characterIds: ids, units: [] } }).success).toBe(false);
    expect(balanceSchema.safeParse({ allyParticipants: { characterIds: [], units: ids.map((id) => ({ id, quantity: 1 })) } }).success).toBe(false);
  });

  it("союзні юніти не збільшують N для діапазону кількості ворогів", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: { characterIds: ["h1", "h2", "h3", "h4"], units: [{ id: "ogre", quantity: 10 }] }, suggest: true }));

    const total = (res.suggestedEnemies ?? []).reduce((a, e) => a + e.quantity, 0);

    expect(total).toBeLessThanOrEqual(8);
    expect(res.allyStats.allyCount).toBe(14);
  });
});
