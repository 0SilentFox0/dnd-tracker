import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export function downedHeroes(participants: BattleParticipant[]): BattleParticipant[] {
  return participants.filter(
    (p) =>
      !p.basicInfo.isExtraTurnSlot &&
      p.basicInfo.sourceType === ParticipantSourceType.CHARACTER &&
      p.basicInfo.side === ParticipantSide.ALLY &&
      isDown(p),
  );
}
