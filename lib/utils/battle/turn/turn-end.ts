import { CombatStatus } from '@/lib/constants/battle';
import {
    idleTurnIndex,
    isActive,
    sitsOutTurn,
} from '@/lib/utils/abilities/engine/core/participants';
import { skippedTurnAt } from '@/lib/utils/battle/turn/skipped-turn';
import { rngOf } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function processEndOfTurn(
    currentTurnIndex: number,
    initiativeOrder: BattleParticipant[],
    currentRound: number,
    skipped: { rules: Ruleset; rng?: () => number }
): {
    nextTurnIndex: number;
    nextRound: number;
    participants?: BattleParticipant[];
    messages?: LogLine[];
} {
    let order = initiativeOrder;

    const messages: LogLine[] = [];

    let nextTurnIndex = currentTurnIndex;

    let nextRound = currentRound;

    let attempts = 0;

    const maxAttempts = initiativeOrder.length;

    do {
        nextTurnIndex += 1;
        attempts += 1;

        if (nextTurnIndex >= initiativeOrder.length) {
            nextTurnIndex = 0;
            nextRound += 1;
        }

        const rolled =
            nextRound === currentRound
                ? skippedTurnAt(order, nextTurnIndex, {
                      rules: skipped.rules,
                      rng: rngOf(skipped),
                      round: nextRound,
                  })
                : null;

        if (rolled) {
            order = rolled.participants;
            messages.push(...rolled.messages);
        }

        const nextParticipant = order[nextTurnIndex];

        if (
            nextParticipant &&
            nextParticipant.combatStats.status !== CombatStatus.DEAD &&
            nextParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS &&
            !sitsOutTurn(nextParticipant, nextRound)
        ) {
            break;
        }

        if (attempts >= maxAttempts) {
            if (initiativeOrder.some(isActive))
                nextTurnIndex = idleTurnIndex(initiativeOrder);

            break;
        }
    } while (true);

    return {
        nextTurnIndex,
        nextRound,
        ...(messages.length > 0 && { participants: order, messages }),
    };
}
