import { wfrpState, withWfrpState } from '../state';
import { fateLeftOf } from './fate';
import { participantStats } from './participant';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export const critWoundsOf = (p: BattleParticipant): number =>
    wfrpState(p).critWounds ?? 0;

export const isOutOfFight = (p: BattleParticipant): boolean =>
    wfrpState(p).outOfFight === true;

/** `combat.onRevived`: raised above 0 HP, the fighter leaves the out-of-fight and death-timer states */
export const wfrpOnRevived = (p: BattleParticipant): BattleParticipant =>
    withWfrpState(p, { outOfFight: undefined, dyingRounds: undefined });

/** Not Today (p133): a Fate point turns death into leaving the fight alive; null without Fate */
export function notToday(p: BattleParticipant): BattleParticipant | null {
    const fate = fateLeftOf(p);

    if (fate < 1) return null;

    return withWfrpState(
        {
            ...p,
            combatStats: {
                ...p.combatStats,
                status: CombatStatus.UNCONSCIOUS,
            },
        },
        { fate: fate - 1, outOfFight: true, dyingRounds: undefined }
    );
}

/** Log line when `next` just left the fight through Not Today */
export const notTodayLine = (
    prev: BattleParticipant,
    next: BattleParticipant
): LogLine | null =>
    !isOutOfFight(prev) && isOutOfFight(next)
        ? textRef('battleWfrp.log.fateNotToday', { name: next.basicInfo.name })
        : null;

const kill = (p: BattleParticipant): BattleParticipant =>
    notToday(p) ?? {
        ...p,
        combatStats: { ...p.combatStats, status: CombatStatus.DEAD },
    };

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
        wfrpState(p).dyingRounds !== undefined ||
        isOutOfFight(p)
    )
        return p;

    return tb <= 0 ? kill(p) : withWfrpState(p, { dyingRounds: tb });
}

/** One round of the death timer for an unconscious fighter; null when none runs */
export function tickDeathTimer(
    p: BattleParticipant
): { participant: BattleParticipant; died: boolean; left: number } | null {
    const left = wfrpState(p).dyingRounds;

    if (left === undefined || isOutOfFight(p)) return null;

    if (left <= 1) {
        const participant = kill(withWfrpState(p, { dyingRounds: undefined }));

        return {
            participant,
            died: participant.combatStats.status === CombatStatus.DEAD,
            left: 0,
        };
    }

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
