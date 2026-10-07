import { CombatStatus } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function isUp(p: BattleParticipant): boolean {
  return p.combatStats.status === CombatStatus.ACTIVE && p.combatStats.currentHp > 0;
}

export function isDown(p: BattleParticipant): boolean {
  return !isUp(p);
}
