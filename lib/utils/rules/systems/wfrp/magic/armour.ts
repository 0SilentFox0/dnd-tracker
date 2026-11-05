import { ARMOUR_SL_PER_AP } from "./constants";

import type { BattleParticipant } from "@/types/battle";

export function armourSl(p: BattleParticipant): number {
  const ap = p.abilities.wfrp?.ap;

  return ap ? Math.max(ap.head, ap.body) * ARMOUR_SL_PER_AP : 0;
}
