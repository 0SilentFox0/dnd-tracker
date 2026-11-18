import { healthState } from './health';

import { CombatStatus } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';

// bucket midpoints against maxHp 100: healthState() reads the same state from the projection
export const HP_BUCKET = {
    unhurt: 100,
    wounded: 75,
    bloodied: 40,
    dying: 10,
    down: 0,
} as const;

export const PROJECTED_MAX_HP = 100;

export function bucketOfHp(p: BattleParticipant, hp: number): number {
    const { status } = p.combatStats;

    return HP_BUCKET[
        healthState({
            ...p,
            combatStats: {
                ...p.combatStats,
                currentHp: hp,
                status: hp > 0 ? CombatStatus.ACTIVE : status,
            },
        })
    ];
}
