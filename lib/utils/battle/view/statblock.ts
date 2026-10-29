import type { BattleParticipant } from "@/types/battle";
import type { UnitStatblock } from "@/types/units";

export function statblockOf({ abilities, battleData }: BattleParticipant): UnitStatblock | null {
  const { senses, movement, languages, telepathy } = battleData;

  if (!abilities.creatureType && !senses && !movement && !languages && telepathy === undefined) return null;

  return { creatureType: abilities.creatureType, senses, movement, languages, telepathy };
}
