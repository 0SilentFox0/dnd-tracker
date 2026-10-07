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

  return { heroes: ["h1", "h2", "h3", "h4"].map(hero), units: [unit("rat", 1, 6, "1d4"), unit("wolf", 2, 40, "2d6")] };
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

import { buildStartOrder } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler";

const setup = [
  ...DATA.heroes.map((h) => ({ id: h.id, type: "character" as const, side: "ally" as const })),
  { id: "rat", type: "unit" as const, side: "enemy" as const, quantity: 2 },
  { id: "wolf", type: "unit" as const, side: "enemy" as const, quantity: 1 },
];

describe("старт бою: рівні бої", () => {
  it("HP ворогів масштабується, damageMultiplier і hpMultiplier лежать у battleData, герої без змін", async () => {
    const { order } = await buildStartOrder("b1", "camp", setup as never);

    const rats = order.filter((p) => p.basicInfo.sourceId === "rat");

    const alone = await buildStartOrder("b1", "camp", setup.filter((x) => x.side === "ally") as never);

    const heroes = order.filter((p) => p.basicInfo.sourceType === "character");

    expect(rats).toHaveLength(2);

    for (const rat of rats) {
      expect(rat.battleData.hpMultiplier).toBeGreaterThan(1);
      expect(rat.battleData.damageMultiplier).toBeGreaterThan(1);
      expect(rat.combatStats.maxHp).toBe(Math.round(6 * (rat.battleData.hpMultiplier ?? 1)));
      expect(rat.combatStats.currentHp).toBe(rat.combatStats.maxHp);
    }

    expect(heroes).toHaveLength(4);

    for (const hero of heroes) {
      expect(hero.combatStats.maxHp).toBe(alone.order.find((p) => p.basicInfo.sourceId === hero.basicInfo.sourceId)?.combatStats.maxHp);
      expect(hero.battleData.damageMultiplier).toBeUndefined();
      expect(hero.battleData.hpMultiplier).toBeUndefined();
    }
  });

  it("стеля тіру: щур після масштабування не міцніший за вовка", async () => {
    const { order } = await buildStartOrder("b1", "camp", setup as never);

    const rat = order.find((p) => p.basicInfo.sourceId === "rat");

    expect(rat?.combatStats.maxHp).toBeLessThanOrEqual(40);
  });

  it("без ворогів-юнітів нічого не масштабує", async () => {
    const { order } = await buildStartOrder("b1", "camp", setup.filter((s) => s.side === "ally") as never);

    expect(order.every((p) => p.battleData.damageMultiplier === undefined)).toBe(true);
  });

  it("без героїв-союзників масштабування пропускається", async () => {
    const { order } = await buildStartOrder("b1", "camp", setup.filter((s) => s.side === "enemy") as never);

    const rat = order.find((p) => p.basicInfo.sourceId === "rat");

    expect(rat?.combatStats.maxHp).toBe(6);
    expect(rat?.battleData.damageMultiplier).toBeUndefined();
  });
});
