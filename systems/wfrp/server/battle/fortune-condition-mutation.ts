import { z } from 'zod';

import { fateSpendsOn } from '../../rules/combat/fate';
import { reduceWfrpConditionIn } from '../../rules/conditions/apply';
import { isWfrpConditionKey } from '../../rules/conditions/catalog';
import { spentFortune } from '../../rules/percentile/fortune';
import { wfrpState, withWfrpState } from '../../rules/state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

export const fortuneConditionSchema = z.object({
    participantId: z.string().min(1),
    condition: z.string().min(1).max(40),
});

export type FortuneConditionBody = z.infer<typeof fortuneConditionSchema>;

const unavailable = () =>
    new BattleRuleError(
        'action_rejected',
        API_ERRORS.FORTUNE_CONDITION_UNAVAILABLE
    );

// Fortune removes one condition (p133); any time, no action, owner or DM.
export function fortuneConditionMutation(
    ctx: BattleMutationContext,
    body: FortuneConditionBody
): MutationResult {
    const conditions = ruleSystemOf(ctx.meta.rules).conditions;

    if (!conditions || !fateSpendsOn(ctx.meta.rules)) throw unavailable();

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        anyTurn: true,
    });

    const key = body.condition;

    if (
        !isWfrpConditionKey(key) ||
        (wfrpState(actor).fortune ?? 0) < 1 ||
        !conditions.list(actor).some((c) => c.key === key)
    )
        throw unavailable();

    const reduced = reduceWfrpConditionIn(
        ctx.participants,
        actor.basicInfo.id,
        key,
        1
    );

    const participants = reduced.participants.map((p) =>
        p.basicInfo.id === actor.basicInfo.id
            ? withWfrpState(p, spentFortune(p))
            : p
    );

    const updated =
        participants.find((p) => p.basicInfo.id === actor.basicInfo.id) ??
        actor;

    const action = newBattleAction(
        actor,
        'ability',
        { battleId: ctx.scene.id, round: ctx.scene.round, targets: [updated] },
        {
            actionDetails: {},
            ...logFields(
                textRef('battleWfrp.log.fortuneCondition', {
                    name: actor.basicInfo.name,
                    condition: dynamicTextRef(
                        `battleWfrp.conditions.${key}.label`
                    ),
                })
            ),
        }
    );

    return {
        participants,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
    };
}
