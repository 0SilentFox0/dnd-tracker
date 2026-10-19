import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleAction } from "@/types/battle";

export const action = (over: Partial<BattleAction> = {}): BattleAction => ({
  id: "b-1",
  battleId: "b",
  round: 1,
  actionIndex: 1,
  timestamp: new Date(0),
  actorId: "a",
  actorName: "A",
  actorSide: ParticipantSide.ALLY,
  actionType: "attack",
  targets: [{ participantId: "t", participantName: "T" }],
  actionDetails: {},
  resultText: "",
  hpChanges: [],
  isCancelled: false,
  ...over,
});
