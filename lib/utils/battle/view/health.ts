import { textRef } from "@/lib/i18n/text-ref";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";
import type { TextRef } from "@/types/text";

export type HealthState = "unhurt" | "wounded" | "bloodied" | "dying" | "down";

export const HEALTH_LABEL: Record<HealthState, TextRef> = {
  unhurt: textRef("battle.view.health.unhurt"),
  wounded: textRef("battle.view.health.wounded"),
  bloodied: textRef("battle.view.health.bloodied"),
  dying: textRef("battle.view.health.dying"),
  down: textRef("battle.view.health.down"),
};

export function hpRatio(p: Pick<BattleParticipant, "combatStats">): number {
  const { currentHp, maxHp } = p.combatStats;

  return maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
}

export function healthState(p: BattleParticipant): HealthState {
  if (isDown(p)) return "down";

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

export type HpTone = "high" | "mid" | "low";

export function hpTone(ratio: number): HpTone {
  if (ratio > 0.5) return "high";

  return ratio > 0.25 ? "mid" : "low";
}
