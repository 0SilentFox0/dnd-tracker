import { describe, expect, it, vi } from "vitest";

const DATA = vi.hoisted(() => {
  const hero = (id: string, maxHp: number) => ({
    id, campaignId: "camp", type: "player", controlledBy: "u", name: id, level: 4, class: "Fighter", race: "Ельф",
    strength: 14, dexterity: 12, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 1, speed: 30,
    maxHp, currentHp: maxHp, spellSlots: {}, knownSpells: [], skillTreeProgress: {}, personalSkillId: null, immunities: [], morale: 0,
    maxTargets: 1, minTargets: 1, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null,
    inventory: { id: `inv-${id}`, characterId: id, equipped: {} },
  });

  const unit = (id: string, level: number, maxHp: number, dice: string, knownSpells: string[] = []) => ({
    id, campaignId: "camp", name: id, raceId: null, level, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: 12, initiative: 0, speed: 30, maxHp, proficiencyBonus: 2, attacks: [{ name: "Удар", attackBonus: 3, damageDice: dice, damageType: "slashing", type: "melee" }],
    knownSpells, avatar: null, immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
  });

  return {
    characters: [hero("h1", 40), hero("h2", 45), hero("h3", 50), hero("h4", 38), hero("npc", 70), hero("bystander", 99)],
    units: [unit("rat", 1, 6, "1d4"), unit("wolf", 2, 40, "2d6"), unit("mage", 3, 30, "1d4", ["fireball"]), unit("ally-guard", 2, 30, "1d8")],
    spells: [{ id: "fireball", type: "aoe", damageType: "damage", target: "enemies", diceCount: 8, diceType: "d6", damageDistribution: null }],
  };
});

vi.mock("@/lib/db", () => {
  const pick = <T extends { id: string }>(rows: T[], args: { where?: { id?: { in?: string[] } } } | undefined) => {
    const ids = args?.where?.id?.in;

    return ids ? rows.filter((r) => ids.includes(r.id)) : rows;
  };

  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method: string) => async (args?: never) => {
        if (name === "character" && method === "findMany") return pick(DATA.characters, args);

        if (name === "unit" && method === "findMany") return pick(DATA.units, args);

        if (name === "spell" && method === "findMany") return pick(DATA.spells, args);

        if (name === "campaign") return { maxLevel: 20 };

        return method === "findMany" ? [] : null;
      },
    });

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { buildStartOrder } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler";
import { getBalancePayload } from "@/app/api/campaigns/[id]/battles/balance/balance-get";
import { type SetupBalanceStats, setupFairScaling } from "@/lib/utils/battle/balance/setup";

const setup = [
  ...["h1", "h2", "h3", "h4"].map((id) => ({ id, type: "character" as const, side: "ally" as const })),
  { id: "ally-guard", type: "unit" as const, side: "ally" as const, quantity: 2 },
  { id: "npc", type: "character" as const, side: "enemy" as const },
  { id: "rat", type: "unit" as const, side: "enemy" as const, quantity: 3 },
  { id: "wolf", type: "unit" as const, side: "enemy" as const, quantity: 1 },
  { id: "mage", type: "unit" as const, side: "enemy" as const, quantity: 1 },
];

describe("паритет: екран складу і старт бою дають однакові множники", () => {
  it("hpMult / dmgMult кожного юніта збігаються, NPC-ворог входить у базу", async () => {
    const payload = (await getBalancePayload("camp")) as unknown as SetupBalanceStats;

    const { scaling } = setupFairScaling(setup, payload);

    const { order } = await buildStartOrder("b1", "camp", setup as never);

    for (const id of ["rat", "wolf", "mage"]) {
      const started = order.find((p) => p.basicInfo.sourceId === id);

      expect(started?.battleData.hpMultiplier).toBeCloseTo(scaling.units[id].hpMult, 10);
      expect(started?.battleData.damageMultiplier).toBeCloseTo(scaling.units[id].dmgMult, 10);
    }

    expect(scaling.fixed.hp).toBe(payload.characterStats.npc.hp);
    expect(scaling.fixed.dpr).toBeGreaterThan(0);
    expect(scaling.base.hp).toBeGreaterThan(payload.characterStats.npc.hp);
    expect(order.find((p) => p.basicInfo.sourceId === "npc")?.battleData.damageMultiplier).toBeUndefined();
  });

  it("NPC-ворог відбирає частку цілі в масштабованих юнітів", async () => {
    const payload = (await getBalancePayload("camp")) as unknown as SetupBalanceStats;

    const withNpc = setupFairScaling(setup, payload).scaling;

    const without = setupFairScaling(setup.filter((p) => p.id !== "npc"), payload).scaling;

    expect(withNpc.units.rat.hpMult).toBeLessThan(without.units.rat.hpMult);
  });
});
