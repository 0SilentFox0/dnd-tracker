import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyVictoryCompletion } from "@/lib/utils/battle/turn/turn-helpers";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/turn/victory";
import type { BattleAction } from "@/types/battle";

describe("completeBattle", () => {
  it("перемога: hpChanges містять відроджених союзників", () => {
    const base = createMockParticipant();

    const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

    const { battleAction, updatedParticipants } = completeBattle([downed], "victory", 3);

    expect(updatedParticipants[0].combatStats.status).toBe("active");
    expect(battleAction.hpChanges).toEqual([expect.objectContaining({ participantId: "hero", oldHp: 0, newHp: downed.combatStats.maxHp, change: -downed.combatStats.maxHp })]);
    expect(battleAction.actionDetails.battleResult).toBe("victory");
  });

  it("applyVictoryCompletion не дублює зміни HP за хід — лише відроджених", () => {
    const base = createMockParticipant();

    const before = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 10 } });

    const regenerated = { ...before, combatStats: { ...before.combatStats, currentHp: 30 } };

    const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "pal", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

    const enemy = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "e", side: ParticipantSide.ENEMY }, combatStats: { ...base.combatStats, currentHp: 0, status: "dead" } });

    const newLogEntries: BattleAction[] = [];

    applyVictoryCompletion({ updatedInitiativeOrder: [regenerated, downed, enemy], initiativeOrder: [before, downed, enemy], battleStatus: "active", battleId: "b", nextRound: 4, currentBattleLogLength: 7, newLogEntries, getStateBeforeForEntry: () => undefined });

    expect(newLogEntries[0]).toMatchObject({ battleId: "b", round: 4, actionIndex: 7, resultText: "🎉 Бій завершено! Перемога союзників!" });
    expect(newLogEntries[0].hpChanges).toEqual([expect.objectContaining({ participantId: "pal", oldHp: 0, change: -downed.combatStats.maxHp })]);
  });

  it("поразка: battleResult у actionDetails", () => {
    expect(completeBattle([createMockParticipant()], "defeat", 2).battleAction.actionDetails.battleResult).toBe("defeat");
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

    const newLogEntries: BattleAction[] = [];

    const out = applyVictoryCompletion({ updatedInitiativeOrder: [hero, enemy, { ...charmedLast, combatStats: { ...charmedLast.combatStats, currentHp: 0, status: "dead" } }], initiativeOrder: [hero, enemy, charmedLast], battleStatus: "active", battleId: "b", nextRound: 2, currentBattleLogLength: 0, newLogEntries, getStateBeforeForEntry: () => undefined });

    expect(out.finalStatus).toBe("completed");
    expect(newLogEntries[0].actionDetails.battleResult).toBe("victory");
    expect(out.updatedInitiativeOrder.find((p) => p.basicInfo.id === "ogre")?.basicInfo.side).toBe(ParticipantSide.ENEMY);
  });
});

describe("перемога з резервом", () => {
  const base = createMockParticipant();

  const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY } });

  const deadGob = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY }, combatStats: { ...base.combatStats, currentHp: 0, status: "dead" } });

  const reserveEnemy = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "imp", side: ParticipantSide.ENEMY }, battleData: { ...base.battleData, reserved: true } });

  const reserveAlly = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "pal", side: ParticipantSide.ALLY }, battleData: { ...base.battleData, reserved: true } });

  it("видимі вороги впали, у резерві ворог — очікування, не перемога", () => {
    expect(checkVictoryConditions([hero, deadGob], [reserveEnemy])).toMatchObject({ result: null, awaiting: "victory" });
  });

  it("резерв лише союзників не заважає перемозі", () => {
    expect(checkVictoryConditions([hero, deadGob], [reserveAlly])).toMatchObject({ result: "victory", awaiting: null });
  });

  it("поразка з союзниками в резерві — очікування", () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: "unconscious" as const } };

    const gob = { ...deadGob, combatStats: { ...deadGob.combatStats, currentHp: 5, status: "active" as const } };

    expect(checkVictoryConditions([downed, gob], [reserveAlly])).toMatchObject({ result: null, awaiting: "defeat" });
  });

  it("без резерву — як раніше", () => {
    expect(checkVictoryConditions([hero, deadGob])).toMatchObject({ result: "victory", awaiting: null });
  });
});
