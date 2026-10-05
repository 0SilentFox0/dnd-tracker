import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

export function participant(id: string, over: Partial<BattleParticipant["basicInfo"]> = {}, rest: Partial<BattleParticipant> = {}) {
  return createMockParticipant({ basicInfo: { ...base.basicInfo, id, battleId: "b1", ...over }, ...rest });
}

export const hero = participant("hero", { controlledBy: "user-1" });

export const goblin = participant("gob", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Гоблін" });

export function context(over: Partial<BattleMutationContext> = {}): BattleMutationContext {
  return {
    scene: {
      id: "b1",
      campaignId: "c1",
      status: "active",
      round: 1,
      turnIndex: 0,
      version: 2,
      eventSeq: 3,
      pendingMoraleCheck: null,
      startedAt: null,
      completedAt: null,
    },
    meta: { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: new Date() },
    participants: [hero, goblin],
    pending: [],
    userId: "user-1",
    isDM: false,
    ...over,
  };
}
