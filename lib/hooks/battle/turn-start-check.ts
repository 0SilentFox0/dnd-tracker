import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

interface TurnStartBattle {
    initiativeOrder: BattleParticipant[];
    currentTurnIndex: number;
    system?: SystemSlot;
    rules: Ruleset;
}

export function turnStartDue(battle: TurnStartBattle, participantId: string) {
    return !!ruleSystemOf(battle.rules).combat.turn?.startCheck?.due(
        {
            participants: battle.initiativeOrder,
            scene: {
                turnIndex: battle.currentTurnIndex,
                sceneState: battle.system,
            },
            rules: battle.rules,
        },
        participantId
    );
}

export function turnStartOutcome(
    battle: Pick<TurnStartBattle, 'system' | 'rules'>,
    participantId: string
) {
    return ruleSystemOf(battle.rules).combat.turn?.startCheck?.outcomeOf(
        battle.system,
        participantId
    );
}
