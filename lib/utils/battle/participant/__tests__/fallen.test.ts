import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { clearFallenEffects } from "@/lib/utils/battle/participant/fallen";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const charm: ActiveEffect = {
  id: "charm",
  name: "Чари",
  type: "debuff",
  duration: 2,
  appliedAt: { round: 1, timestamp: new Date(0) },
  effects: [],
  charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: "dm" },
};

function charmed(status: BattleParticipant["combatStats"]["status"]): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id: "gob", side: ParticipantSide.ALLY, controlledBy: "u" },
    combatStats: { ...b.combatStats, status },
    battleData: { ...b.battleData, activeEffects: [charm] },
  };
}

describe("clearFallenEffects", () => {
  it("полеглий зачарований повертається на свій бік без ефектів", () => {
    const [out] = clearFallenEffects([charmed(CombatStatus.DEAD)]);

    expect(out.battleData.activeEffects).toEqual([]);
    expect(out.basicInfo.side).toBe(ParticipantSide.ENEMY);
    expect(out.basicInfo.controlledBy).toBe("dm");
  });

  it("живих не чіпає", () => {
    const list = [charmed(CombatStatus.ACTIVE)];

    expect(clearFallenEffects(list)).toBe(list);
  });
});
