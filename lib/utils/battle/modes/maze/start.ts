import { inwardFacing } from "./direction";

import { ParticipantSide } from "@/lib/constants/battle";
import { takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

// вороги вже сплячі з buildStartOrder; герої дивляться всередину лабіринту
function faceInward(map: BattleMapConfig, order: BattleParticipant[]): BattleParticipant[] {
  return order.map((p) => {
    const at = p.battleData.position;

    return at && p.basicInfo.side !== ParticipantSide.ENEMY ? { ...p, battleData: { ...p.battleData, facing: inwardFacing(map, at) } } : p;
  });
}

export function startMaze(map: BattleMapConfig, order: BattleParticipant[]): { participants: BattleParticipant[]; turnIndex: number } {
  const participants = faceInward(map, order);

  return { participants, turnIndex: Math.max(0, participants.findIndex((p) => takesTurn(p, 1))) };
}
