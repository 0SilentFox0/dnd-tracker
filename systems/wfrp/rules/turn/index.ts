import { wfrpConditionsTurnStart } from '../conditions/tick';
import { wfrpPsychology } from '../traits/psychology';
import { wfrpOnSkippedTurn } from './skipped-turn';

import type { RuleSystemTurn } from '@/lib/utils/rules/systems/types';

export const WFRP_TURN: RuleSystemTurn = {
    onTurnStart: [
        (ctx) => wfrpConditionsTurnStart(ctx.participants, ctx.id, ctx),
    ],
    onSkippedTurn: [wfrpOnSkippedTurn],
    onJoin: [(ctx) => wfrpPsychology(ctx.participants, ctx)],
};
