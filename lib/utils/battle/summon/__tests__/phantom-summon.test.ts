import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyAbilitySummons } from "@/lib/utils/battle/summon/ability-summons";
import { dismissPhantoms } from "@/lib/utils/battle/summon/phantom-summon";

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

  it("a multi-target cast keeps all its phantoms; a recast dismisses all old ones", async () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const a = makeParticipant({ id: "a", side: ParticipantSide.ENEMY });

    const b = makeParticipant({ id: "b", side: ParticipantSide.ENEMY });

    const opts = { campaignId: "c1", battleId: "b1", rng: () => 0, deps: { loadPool: async () => ({ units: [], races: [] }) } };

    const first = await applyAbilitySummons(
      [
        { ownerId: "mage", cloneOf: "a", count: 1, spellId: "sp", castId: "c1" },
        { ownerId: "mage", cloneOf: "b", count: 1, spellId: "sp", castId: "c1" },
      ],
      [mage, a, b],
      opts,
    );

    expect(live(first.order)).toHaveLength(2);

    const second = await run(first.order, "a", "c2");

    expect(live(second.order).map((p) => p.basicInfo.id)).toEqual(["phantom:c2:1"]);
  });

  it("dismissed phantom drops its concentration effects", () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const ally = makeParticipant({ id: "ally", side: ParticipantSide.ALLY });

    const ph = makeParticipant({ id: "phantom:c1:1", side: ParticipantSide.ALLY });

    const phantom = { ...ph, battleData: { ...ph.battleData, phantomOf: "mage", activeEffects: [makeEffect("conc", { concentration: { castId: "k", spellName: "Bless" } })] } };

    const buffed = { ...ally, battleData: { ...ally.battleData, activeEffects: [makeEffect("buff", { concentrationOf: { casterId: "phantom:c1:1", castId: "k" } })] } };

    const { order } = dismissPhantoms([mage, buffed, phantom], "mage");

    expect(order.find((p) => p.basicInfo.id === "ally")?.battleData.activeEffects).toHaveLength(0);
    expect(order.find((p) => p.basicInfo.id === "phantom:c1:1")?.battleData.activeEffects).toHaveLength(0);
  });

  it("pre-deploy phantoms without phantomOf are matched by id + summonedBy", () => {
    const mage = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

    const ph = makeParticipant({ id: "phantom:old:1", side: ParticipantSide.ALLY });

    const legacy = { ...ph, battleData: { ...ph.battleData, summonedBy: "mage" } };

    const { order, messages } = dismissPhantoms([mage, legacy], "mage");

    expect(order[1].combatStats.status).toBe(CombatStatus.DEAD);
    expect(messages).toHaveLength(1);
  });
});
