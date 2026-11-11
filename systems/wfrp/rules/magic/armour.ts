import { ARMOUR_SL_PER_AP } from "./constants";

import type { BattleParticipant } from "@/types/battle";

export function armourSl(p: BattleParticipant): number {
  const { ap, castAp, flexible } = p.abilities.wfrp ?? {};

  if (!ap || flexible) return 0;

  return (castAp ?? Math.max(ap.head, ap.body)) * ARMOUR_SL_PER_AP;
}
