import { wfrpState, withWfrpState } from '../state';
import { participantStats } from './participant';

import { CombatStatus } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';

export const critWoundsOf = (p: BattleParticipant): number =>
    wfrpState(p).critWounds ?? 0;

const kill = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    combatStats: { ...p.combatStats, status: CombatStatus.DEAD },
});

/** Canon5e bookkeeping after a Critical Wound: death rows kill, more crits than TB + unconscious starts the death timer (p172) */
export function recordCritWound(
    p: BattleParticipant,
    death: boolean
): BattleParticipant {
    if (death)
        return kill(withWfrpState(p, { critWounds: critWoundsOf(p) + 1 }));

    const next = withWfrpState(p, { critWounds: critWoundsOf(p) + 1 });

    return startDeathTimer(next);
}

export function startDeathTimer(p: BattleParticipant): BattleParticipant {
    const tb = participantStats(p)?.tb ?? 0;

    if (
        p.combatStats.status !== CombatStatus.UNCONSCIOUS ||
        critWoundsOf(p) <= tb ||
        wfrpState(p).dyingRounds !== undefined
    )
        return p;

    return tb <= 0 ? kill(p) : withWfrpState(p, { dyingRounds: tb });
}

/** One round of the death timer for an unconscious fighter; null when none runs */
export function tickDeathTimer(
    p: BattleParticipant
): { participant: BattleParticipant; died: boolean; left: number } | null {
    const left = wfrpState(p).dyingRounds;

    if (left === undefined) return null;

    if (left <= 1)
        return {
            participant: kill(withWfrpState(p, { dyingRounds: undefined })),
            died: true,
            left: 0,
        };

    return {
        participant: withWfrpState(p, { dyingRounds: left - 1 }),
        died: false,
        left: left - 1,
    };
}

export const clearDeathTimer = (p: BattleParticipant): BattleParticipant =>
    wfrpState(p).dyingRounds === undefined
        ? p
        : withWfrpState(p, { dyingRounds: undefined });
