import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyAbilitySummons } from "@/lib/utils/battle/summon/ability-summons";

const run = (order: ReturnType<typeof makeParticipant>[]) =>
  applyAbilitySummons([{ ownerId: "mage", cloneOf: "knight", count: 1, spellId: "sp", castId: "c1" }], order, { campaignId: "c1", battleId: "b1", rng: () => 0, deps: { loadPool: async () => ({ units: [], races: [] }) } });

describe("phantom clone", () => {
  it("копіює ціль на бік кастера з 1 HP під його керуванням", async () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const knight = makeParticipant({ id: "knight", side: ParticipantSide.ENEMY });

    const { order } = await run([mage, knight]);

    const phantom = order.find((p) => p.basicInfo.id.startsWith("phantom:"));

    expect(phantom).toBeDefined();
    expect(phantom?.basicInfo.side).toBe(ParticipantSide.ALLY);
    expect(phantom?.basicInfo.controlledBy).toBe(mage.basicInfo.controlledBy);
    expect(phantom?.combatStats).toMatchObject({ maxHp: 1, currentHp: 1, armorClass: knight.combatStats.armorClass, status: CombatStatus.ACTIVE });
    expect(phantom?.abilities.strength).toBe(knight.abilities.strength);
    expect(order.find((p) => p.basicInfo.id === "knight")?.combatStats.currentHp).toBe(knight.combatStats.currentHp);
  });
});
