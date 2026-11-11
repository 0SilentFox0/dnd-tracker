import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyAbilitySummons } from "@/lib/utils/battle/summon/ability-summons";

const run = (order: ReturnType<typeof makeParticipant>[], cloneOf = "knight", castId = "c1") =>
  applyAbilitySummons([{ ownerId: "mage", cloneOf, count: 1, spellId: "sp", castId }], order, { campaignId: "c1", battleId: "b1", rng: () => 0, deps: { loadPool: async () => ({ units: [], races: [] }) } });

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

  const clones = (ps: ReturnType<typeof makeParticipant>[], owner = "mage") => ps.filter((p) => p.battleData.phantomOf === owner);

  const live = (ps: ReturnType<typeof makeParticipant>[], owner = "mage") => clones(ps, owner).filter((p) => p.combatStats.status === CombatStatus.ACTIVE);

  it("a second cast dissolves the caster's previous phantom: one live at a time", async () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const knight = makeParticipant({ id: "knight", side: ParticipantSide.ENEMY });

    const first = await run([mage, knight]);

    const second = await run(first.order, "mage", "c2");

    expect(clones(second.order)).toHaveLength(2);
    expect(live(second.order)).toHaveLength(1);
    expect(live(second.order)[0].basicInfo.id).toBe("phantom:c2:1");
    expect(clones(second.order).find((p) => p.basicInfo.id === "phantom:c1:1")?.battleData).toMatchObject({ dismissed: true });
    expect(clones(second.order).find((p) => p.basicInfo.id === "phantom:c1:1")?.battleData.position).toBeUndefined();
    expect(second.messages).toHaveLength(2);
  });

  it("another caster's phantom stays", async () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const knight = makeParticipant({ id: "knight", side: ParticipantSide.ENEMY });

    const first = await run([mage, knight]);

    const foreign = first.order.map((p) => (p.battleData.phantomOf ? { ...p, battleData: { ...p.battleData, phantomOf: "other", summonedBy: "other" } } : p));

    const second = await run(foreign, "knight", "c2");

    expect(live(second.order, "other")).toHaveLength(1);
    expect(live(second.order)).toHaveLength(1);
  });

  it("a dead phantom is not dissolved again and gives no message", async () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const knight = makeParticipant({ id: "knight", side: ParticipantSide.ENEMY });

    const first = await run([mage, knight]);

    const killed = first.order.map((p) => (p.battleData.phantomOf ? { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.DEAD } } : p));

    const second = await run(killed, "knight", "c2");

    expect(live(second.order)).toHaveLength(1);
    expect(second.messages).toHaveLength(1);
  });
});
