import { wfrpConditionsTurnStart } from '../conditions/tick';
import { editionOf } from '../edition';
import { channelUpkeep } from '../magic/channel-loss';
import { wfrpEndTurnState, wfrpResetState } from '../state-parts';
import {
    wfrpFrenzyRoundStart,
    wfrpFrenzyTurnStart,
    wfrpPassionsJoin,
    wfrpPassionsRoundStart,
} from '../traits/passions';
import { wfrpFearRound, wfrpPsychology } from '../traits/psychology';
import { wfrpOnMoveEnd } from './move-end';
import { wfrpPsychologyGate } from './psychology-gate';
import {
    wfrpEngagementExpiry,
    wfrpRegenerate,
    wfrpSwarmRoundEnd,
} from './reserved-hooks';
import { wfrpRoundOrder } from './round-order';
import { wfrpOnSkippedTurn } from './skipped-turn';

import type { RuleSystemTurn } from '@/lib/utils/rules/systems/types';

export const WFRP_TURN: RuleSystemTurn = {
    resetState: [wfrpResetState],
    onTurnStart: [
        (ctx) => wfrpConditionsTurnStart(ctx.participants, ctx.id, ctx),
        (ctx) => wfrpFrenzyTurnStart(ctx.participants, ctx.id, ctx),
        wfrpRegenerate,
    ],
    actGates: [wfrpPsychologyGate],
    onSkippedTurn: [wfrpOnSkippedTurn],
    onMoveEnd: [wfrpOnMoveEnd],
    onTurnEnd: [
        wfrpEndTurnState,
        wfrpSwarmRoundEnd,
        wfrpEngagementExpiry,
        (ctx) =>
            editionOf(ctx.rules).magicModel === 'canon5e'
                ? channelUpkeep(ctx.participants, ctx.id, ctx)
                : { participants: ctx.participants, messages: [] },
    ],
    onRoundStart: [
        wfrpRoundOrder,
        (ctx) => wfrpFearRound(ctx.participants, ctx),
        (ctx) => wfrpFrenzyRoundStart(ctx.participants, ctx),
        (ctx) => wfrpPassionsRoundStart(ctx.participants, ctx),
    ],
    onJoin: [
        (ctx) => wfrpPsychology(ctx.participants, ctx),
        (ctx) => wfrpPassionsJoin(ctx.participants, ctx),
    ],
};
