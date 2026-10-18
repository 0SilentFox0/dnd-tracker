import type { DamageStep } from "@/types/battle";

export const OBSTACLE_LABEL = "Перешкода";

export const OBSTACLE_MULTIPLIER = 0.5;

/** «Перешкода»: підсумкова шкода атаки ×0.5 (вниз), але не менше 1, якщо до неї було ≥ 1. */
export function applyObstacle(damage: number): number {
  return damage >= 1 ? Math.max(1, Math.floor(damage * OBSTACLE_MULTIPLIER)) : damage;
}

export function obstacleStep(before: number): DamageStep {
  return { label: OBSTACLE_LABEL, side: "attacker", kind: "multiplier", value: OBSTACLE_MULTIPLIER, after: applyObstacle(before) };
}
