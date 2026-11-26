import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import { asShownCounter } from '@/lib/utils/battle/counter/pending';
import type { PendingChoice } from '@/lib/utils/battle/store/types';
import type { BattleParticipant } from '@/types/battle';

export interface ReassignOutcome {
    participants: BattleParticipant[];
    pending: BattleParticipant[];
    reassigned: BattleParticipant[];
}

export function reassignControlledBy(
    participants: BattleParticipant[],
    pending: BattleParticipant[],
    userId: string
): ReassignOutcome {
    const reassigned: BattleParticipant[] = [];

    const handOver = (p: BattleParticipant) => {
        if (p.basicInfo.controlledBy !== userId) return p;

        const next = {
            ...p,
            basicInfo: { ...p.basicInfo, controlledBy: CONTROLLED_BY_DM },
        };

        reassigned.push(next);

        return next;
    };

    return {
        participants: participants.map(handOver),
        pending: pending.map(handOver),
        reassigned,
    };
}

/** Counter offers of handed-over reactors become DM offers; a held cast of the user resumes as the DM. */
export function retargetPendingChoice(
    choice: PendingChoice | null,
    userId: string,
    dmUserId: string,
    reassignedIds: ReadonlySet<string>
): PendingChoice | null {
    if (!choice) return choice;

    const shown = asShownCounter(choice.shown);

    const nextShown =
        shown && shown.offers.some((o) => reassignedIds.has(o.reactorId))
            ? {
                  ...shown,
                  offers: shown.offers.map((o) =>
                      reassignedIds.has(o.reactorId) ? { ...o, dm: true } : o
                  ),
              }
            : choice.shown;

    const hidden = choice.hidden as { userId?: unknown } | null;

    const nextHidden =
        hidden && typeof hidden === 'object' && hidden.userId === userId
            ? { ...hidden, userId: dmUserId, isDM: true }
            : choice.hidden;

    return nextShown === choice.shown && nextHidden === choice.hidden
        ? choice
        : { shown: nextShown, hidden: nextHidden };
}
