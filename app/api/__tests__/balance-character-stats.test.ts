import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ byKey: {} as Record<string, number> }));

const CHARACTERS = vi.hoisted(() =>
  ["c1", "c2", "c3"].map((id) => ({
    id, campaignId: "camp", type: "player", controlledBy: "u", name: id, level: 4, class: "Fighter", race: "Ельф",
    strength: 14, dexterity: 12, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 1, speed: 30,
    maxHp: 30, currentHp: 30, spellSlots: {}, knownSpells: [], skillTreeProgress: {}, personalSkillId: null, immunities: [], morale: 0,
    maxTargets: 1, minTargets: 1, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null,
    inventory: { id: `inv-${id}`, characterId: id, equipped: { mainHand: "w1" } },
  })),
);

vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async () => {
          const key = `${name}.${method}`;

          calls.byKey[key] = (calls.byKey[key] ?? 0) + 1;

          if (key === "character.findMany") return CHARACTERS;

          if (key === "artifact.findMany") return [{ id: "w1", campaignId: "camp", name: "Меч", slot: "weapon", modifiers: [], bonuses: {}, setId: null, abilities: [] }];

          if (key === "campaign.findUnique") return { maxLevel: 20 };

          return method === "findMany" ? [] : null;
        },
      },
    );

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { loadCharacterBalanceStats } from "@/app/api/campaigns/[id]/battles/balance/character-stats";

describe("loadCharacterBalanceStats", () => {
  it("один контекст на всіх: без запиту на кожного персонажа, запитів не більше, ніж було (4 + 2N)", async () => {
    const rows = await loadCharacterBalanceStats("camp");

    const total = Object.values(calls.byKey).reduce((a, b) => a + b, 0);

    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.stats.dpr > 0)).toBe(true);
    expect(calls.byKey["character.findUnique"]).toBeUndefined();
    expect(calls.byKey["character.findMany"]).toBe(1);
    expect(total).toBeLessThanOrEqual(4 + 2 * CHARACTERS.length);
  });
});
