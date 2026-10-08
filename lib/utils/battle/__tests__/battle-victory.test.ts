import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/battle-victory";
import { applyVictoryCompletion } from "@/lib/utils/battle/turn/turn-helpers";

describe("completeBattle", () => {
  it("перемога: hpChanges містять відроджених союзників", () => {
    const base = createMockParticipant();

    const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

    const { battleAction, updatedParticipants } = completeBattle([downed], "victory", 3);

    expect(updatedParticipants[0].combatStats.status).toBe("active");
    expect(battleAction.hpChanges).toEqual([expect.objectContaining({ participantId: "hero", oldHp: 0, newHp: downed.combatStats.maxHp })]);
  });
});

describe("зачарований юніт і перемога", () => {
  const base = createMockParticipant();

  const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY } });

  const charmedLast = createMockParticipant({
    basicInfo: { ...base.basicInfo, id: "ogre", side: ParticipantSide.ALLY, controlledBy: "user-1" },
    battleData: {
      ...base.battleData,
      activeEffects: [{ id: "c", name: "Ляльковод", type: "condition", duration: 1, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "charm", value: 1 }], charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: "dm" } }],
    },
  });

  it("остання жива ворожа істота під чарами не завершує бій перемогою", () => {
    expect(checkVictoryConditions([hero, charmedLast]).result).toBeNull();
  });

  it("після закінчення чарів, якщо ворог мертвий, перемога є; завершення бою повертає сторони", () => {
    const dead = { ...charmedLast, combatStats: { ...charmedLast.combatStats, currentHp: 0, status: "dead" as const } };

    expect(checkVictoryConditions([hero, dead]).result).toBe("victory");

    const { updatedParticipants } = completeBattle([hero, charmedLast], "defeat", 2);

    const ogre = updatedParticipants.find((p) => p.basicInfo.id === "ogre");

    expect(ogre?.basicInfo).toMatchObject({ side: ParticipantSide.ENEMY, controlledBy: "dm" });
    expect(ogre?.battleData.activeEffects).toHaveLength(0);
  });

  it("applyVictoryCompletion завершує бій і відновлює сторони зачарованих", () => {
    const enemy = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "e", side: ParticipantSide.ENEMY }, combatStats: { ...base.combatStats, currentHp: 0, status: "dead" } });

    const out = applyVictoryCompletion({ updatedInitiativeOrder: [hero, enemy, { ...charmedLast, combatStats: { ...charmedLast.combatStats, currentHp: 0, status: "dead" } }], initiativeOrder: [hero, enemy, charmedLast], battleStatus: "active", battleId: "b", nextRound: 2, currentBattleLogLength: 0, newLogEntries: [], getStateBeforeForEntry: () => undefined });

    expect(out.finalStatus).toBe("completed");
    expect(out.updatedInitiativeOrder.find((p) => p.basicInfo.id === "ogre")?.basicInfo.side).toBe(ParticipantSide.ENEMY);
  });
});
