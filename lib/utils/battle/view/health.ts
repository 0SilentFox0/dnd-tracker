import type { BattleParticipant } from "@/types/battle";

export type HealthState = "unhurt" | "wounded" | "bloodied" | "dying" | "down";

export const HEALTH_LABEL: Record<HealthState, string> = {
  unhurt: "неушкоджений",
  wounded: "поранений",
  bloodied: "закривавлений",
  dying: "при смерті",
  down: "повалений",
};

export function healthState(p: BattleParticipant): HealthState {
  const { currentHp, maxHp, status } = p.combatStats;

  if (status !== "active" || currentHp <= 0) return "down";

  const ratio = maxHp > 0 ? currentHp / maxHp : 0;

  if (ratio >= 1) return "unhurt";

  if (ratio > 0.5) return "wounded";

  if (ratio > 0.25) return "bloodied";

  return "dying";
}

const SEGMENTS = { unhurt: 4, wounded: 3, bloodied: 2, dying: 1, down: 0 } as const;

export function healthSegments(s: HealthState): 0 | 1 | 2 | 3 | 4 {
  return SEGMENTS[s];
}
