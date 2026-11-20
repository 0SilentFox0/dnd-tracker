import { wfrpConditionsTurnStart } from '../conditions/tick';
import { wfrpEndTurnState, wfrpResetState } from '../state-parts';
import { wfrpPsychology } from '../traits/psychology';
import { wfrpOnSkippedTurn } from './skipped-turn';

import type { RuleSystemTurn } from '@/lib/utils/rules/systems/types';

export const WFRP_TURN: RuleSystemTurn = {
    resetState: [wfrpResetState],
    onTurnStart: [
        (ctx) => wfrpConditionsTurnStart(ctx.participants, ctx.id, ctx),
    ],
    onSkippedTurn: [wfrpOnSkippedTurn],
    onTurnEnd: [wfrpEndTurnState],
    onJoin: [(ctx) => wfrpPsychology(ctx.participants, ctx)],
};
