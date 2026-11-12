import { isDying } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant } from "@/types/battle";

export const DEATH_SAVES_TIMED_KEY = "death-saves:unconscious";

export const FRESH_DEATH_SAVES = { successes: 0, failures: 0, stable: false };

export { isDying };

export function clearDeathSaves(p: BattleParticipant): BattleParticipant {
  if (!p.battleData.deathSaves) return p;

  const { deathSaves: _removed, ...battleData } = p.battleData;

  return { ...p, battleData: { ...battleData, activeEffects: battleData.activeEffects.filter((e) => e.abilityKey !== DEATH_SAVES_TIMED_KEY) } };
}
