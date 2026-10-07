import { BattleStatus } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export type HealthState = "unhurt" | "wounded" | "bloodied" | "dying" | "down";

export const HEALTH_LABEL: Record<HealthState, string> = {
  unhurt: "неушкоджений",
  wounded: "поранений",
  bloodied: "закривавлений",
  dying: "при смерті",
  down: "повалений",
};

export function hpRatio(p: Pick<BattleParticipant, "combatStats">): number {
  const { currentHp, maxHp } = p.combatStats;

  return maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
}

export function healthState(p: BattleParticipant): HealthState {
  const { currentHp, status } = p.combatStats;

  if (status !== BattleStatus.ACTIVE || currentHp <= 0) return "down";

  const ratio = hpRatio(p);

  if (ratio >= 1) return "unhurt";

  if (ratio > 0.5) return "wounded";

  if (ratio > 0.25) return "bloodied";

  return "dying";
}

const SEGMENTS = { unhurt: 4, wounded: 3, bloodied: 2, dying: 1, down: 0 } as const;

export function healthSegments(s: HealthState): 0 | 1 | 2 | 3 | 4 {
  return SEGMENTS[s];
}
