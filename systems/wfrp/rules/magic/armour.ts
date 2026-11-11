import { participantStats } from "../combat/participant";
import { ARMOUR_SL_PER_AP } from "./constants";

import type { BattleParticipant } from "@/types/battle";

export function armourSl(p: BattleParticipant): number {
  const { ap, castAp, flexible } = participantStats(p) ?? {};

  if (!ap || flexible) return 0;

  return (castAp ?? Math.max(ap.head, ap.body)) * ARMOUR_SL_PER_AP;
}
