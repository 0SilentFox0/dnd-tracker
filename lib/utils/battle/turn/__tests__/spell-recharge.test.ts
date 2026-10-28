import { describe, expect, it, vi } from "vitest";

import { ParticipantSide, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
import { runAdvanceTurnLoop } from "@/lib/utils/battle/turn/run-advance-turn-loop";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import type { BattleParticipant } from "@/types/battle";

const key = "pool:spell:breath";

function dragon(spent = 1, recharge: number | undefined = 5): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id: "dragon", side: ParticipantSide.ENEMY },
    battleData: {
      ...base.battleData,
      pools: { [key]: { label: "Вогняний подих", max: 1, rest: null, recharge: recharge as 5 } },
      abilityUsage: { [key]: { battle: spent, round: 0, turn: 0, lastRound: 1 } },
    },
  };
}

describe("spell recharge at the owner's turn start", () => {
  it.each([[3 / 6, 1, "не перезарядилась (4)"], [4 / 6, 0, "перезарядилась (5)"], [5 / 6, 0, "перезарядилась (6)"]])("d6 from deterministic RNG %s leaves usage %s", (seed, used, message) => {
    const p = dragon();

    const out = processStartOfTurn(p, 2, [p], () => seed);

    expect(out.participant.battleData.abilityUsage?.[key].battle).toBe(used);
    expect(out.rechargeMessages).toEqual([`🔄 Вогняний подих ${message}`]);
    expect(p.battleData.abilityUsage?.[key].battle).toBe(1);
  });

  it.each([undefined, 3, 7, 4.5])("does not roll for recharge=%s", (recharge) => {
    const p = dragon(1, recharge);

    const pool = p.battleData.pools?.[key];

    if (recharge === undefined && pool) delete pool.recharge;

    const rng = vi.fn(() => 0.99);

    const out = processStartOfTurn(p, 2, [p], rng);

    expect(out.participant.battleData.abilityUsage?.[key].battle).toBe(1);
    expect(out.rechargeMessages).toEqual([]);
    expect(rng).not.toHaveBeenCalled();
  });

  it("does not roll an unspent pool or recharge another participant", () => {
    const fresh = dragon(0);

    const other = { ...dragon(), basicInfo: { ...fresh.basicInfo, id: "other" } };

    const rng = vi.fn(() => 0.99);

    const out = processStartOfTurn(fresh, 2, [fresh, other], rng);

    expect(rng).not.toHaveBeenCalled();
    expect(out.participants.find((p) => p.basicInfo.id === "other")?.battleData.abilityUsage?.[key].battle).toBe(1);
  });

  it("preserves the definitions hash while the reset usage round-trips through persisted state", () => {
    const p = dragon();

    const before = splitParticipant(p, { orderIndex: 0, isPending: false });

    const after = splitParticipant(processStartOfTurn(p, 2, [p], () => 0.99).participant, { orderIndex: 0, isPending: false });

    expect(after.snapshotHash).toBe(before.snapshotHash);
    expect(joinParticipant(after, "battle").battleData.abilityUsage?.[key].battle).toBe(0);
  });

  it("turn advance writes a system event with the spell's name and rolled result", () => {
    const hero = createMockParticipant();

    const out = runAdvanceTurnLoop({ initiativeOrder: [hero, dragon()], currentTurnIndex: 0, currentRound: 1, battleId: "battle", currentBattleLogLength: 7, pendingSummons: [], rng: () => 4 / 6 });

    expect(out.updatedInitiativeOrder[1].battleData.abilityUsage?.[key].battle).toBe(0);
    expect(out.newLogEntries).toContainEqual(expect.objectContaining({ ...SYSTEM_ACTOR, resultText: "🔄 Вогняний подих перезарядилась (5)", actionIndex: 7, actionType: "ability" }));
  });
});
