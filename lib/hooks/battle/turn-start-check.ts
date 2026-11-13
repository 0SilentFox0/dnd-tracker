import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

interface TurnStartBattle {
    initiativeOrder: BattleParticipant[];
    currentTurnIndex: number;
    pendingMoraleCheck?: unknown;
    rules: Ruleset;
}

export function turnStartDue(battle: TurnStartBattle, participantId: string) {
    return !!ruleSystemOf(battle.rules).combat.turn?.startCheck?.due(
        {
            participants: battle.initiativeOrder,
            scene: {
                turnIndex: battle.currentTurnIndex,
                pendingMoraleCheck: battle.pendingMoraleCheck,
            },
            rules: battle.rules,
        },
        participantId
    );
}

export function turnStartOutcome(
    battle: Pick<TurnStartBattle, 'pendingMoraleCheck' | 'rules'>,
    participantId: string
) {
    return ruleSystemOf(battle.rules).combat.turn?.startCheck?.outcomeOf(
        battle.pendingMoraleCheck,
        participantId
    );
}
