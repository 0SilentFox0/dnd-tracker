import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { lineText, logFields } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { assertCanAct } from '@/lib/utils/battle/turn';
import { rngOf } from '@/lib/utils/common/rng';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

export const conditionTestSchema = z
    .object({
        participantId: z.string().min(1),
        condition: z.string().min(1).max(40),
        roll: z.number().int().min(1).max(100).optional(),
        serverRoll: z.boolean().optional(),
    })
    .refine((d) => d.roll !== undefined || d.serverRoll === true, {
        message: REJECT.rollsRequired,
        path: ['roll'],
    });

export type ConditionTestBody = z.infer<typeof conditionTestSchema>;

const unavailable = () =>
    new BattleRuleError(
        'action_rejected',
        API_ERRORS.CONDITION_TEST_UNAVAILABLE
    );

export function conditionTestMutation(
    ctx: BattleMutationContext,
    body: ConditionTestBody
): MutationResult {
    const conditions = ruleSystemOf(ctx.meta.rules).conditions;

    if (!conditions)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.CONDITION_UNSUPPORTED
        );

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: {
            code: 'action_rejected',
            message: API_ERRORS.CONDITION_TEST_UNAVAILABLE,
        },
    });

    if (currentOf(ctx)?.basicInfo.id !== actor.basicInfo.id)
        throw unavailable();

    assertCanAct(ctx, actor.basicInfo.id);

    const info = conditions.catalog.find((c) => c.key === body.condition);

    if (
        !info ||
        info.endTest === null ||
        !conditions.list(actor).some((c) => c.key === body.condition) ||
        (actor.battleData.conditionTests ?? []).includes(body.condition)
    )
        throw unavailable();

    const round = ctx.scene.round;

    const r = conditions.attemptEnd(
        ctx.participants,
        actor.basicInfo.id,
        body.condition,
        {
            round,
            rng: rngOf(ctx),
            rules: ctx.meta.rules,
            presetRoll: body.serverRoll ? undefined : body.roll,
        }
    );

    const participants = r.participants.map((p) =>
        p.basicInfo.id === actor.basicInfo.id
            ? {
                  ...p,
                  battleData: {
                      ...p.battleData,
                      conditionTests: [
                          ...(actor.battleData.conditionTests ?? []),
                          body.condition,
                      ],
                  },
              }
            : p
    );

    const updated =
        participants.find((p) => p.basicInfo.id === actor.basicInfo.id) ??
        actor;

    const action = newBattleAction(
        actor,
        'ability',
        { battleId: ctx.scene.id, round, targets: [updated] },
        { actionDetails: {}, ...logFields(lineText(r.messages, '; ')) }
    );

    return {
        participants,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
    };
}
