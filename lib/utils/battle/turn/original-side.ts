import type { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

/** Зачарований юніт у переможних умовах лишається на своєму початковому боці. */
export function originalSide(p: BattleParticipant): ParticipantSide {
  const origin = p.battleData.charmReturn ?? p.battleData.activeEffects.find((e) => e.charmOrigin)?.charmOrigin;

  return origin?.side ?? p.basicInfo.side;
}
