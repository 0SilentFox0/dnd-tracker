import { textRef } from '@/lib/i18n/text-ref';
import type { DamageStep } from '@/types/battle-actions';

export const OBSTACLE_LABEL = textRef('battleLog.damage.steps.obstacle');

export const OBSTACLE_MULTIPLIER = 0.5;

export function applyObstacle(damage: number): number {
    return damage >= 1
        ? Math.max(1, Math.floor(damage * OBSTACLE_MULTIPLIER))
        : damage;
}

export function obstacleStep(before: number): DamageStep {
    return {
        label: OBSTACLE_LABEL,
        side: 'attacker',
        kind: 'multiplier',
        value: OBSTACLE_MULTIPLIER,
        after: applyObstacle(before),
    };
}
