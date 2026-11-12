import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CONDITION_LIMITS } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { lineText } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError, dmEvent } from '@/lib/utils/battle/store';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

export const systemConditionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('apply'),
        participantId: z.string().min(1),
        condition: z.string().min(1).max(40),
        levels: z.number().int().min(1).max(10).optional(),
        rounds: z.number().int().min(1).max(CONDITION_LIMITS.rounds).optional(),
    }),
    z.object({
        action: z.literal('remove'),
        participantId: z.string().min(1),
        condition: z.string().min(1).max(40),
        all: z.boolean().optional(),
    }),
]);

export type SystemConditionBody = z.infer<typeof systemConditionSchema>;

export function systemConditionMutation(
    ctx: BattleMutationContext,
    body: SystemConditionBody
): MutationResult {
    const conditions = ruleSystemOf(ctx.meta.rules).conditions;

    if (
        !conditions ||
        !conditions.catalog.some((c) => c.key === body.condition)
    )
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.CONDITION_UNSUPPORTED
        );

    const target = findParticipant(ctx.participants, body.participantId);

    if (!target)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MEMBER_NOT_FOUND
        );

    const round = ctx.scene.round;

    const targets = [
        {
            participantId: target.basicInfo.id,
            participantName: target.basicInfo.name,
        },
    ];

    if (body.action === 'apply') {
        const out = conditions.apply(ctx.participants, body.participantId, {
            key: body.condition,
            levels: body.levels,
            rounds: body.rounds,
            round,
            sourceName: textRef('battleLog.dm.name'),
        });

        return {
            participants: out.participants,
            pending: ctx.pending,
            events: out.messages.length
                ? [dmEvent(round, lineText(out.messages, '; '), targets)]
                : [],
        };
    }

    if (!conditions.list(target).some((c) => c.key === body.condition))
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.CONDITION_ABSENT,
            { name: target.basicInfo.name }
        );

    const out = conditions.reduce(
        ctx.participants,
        body.participantId,
        body.condition,
        body.all ? 'all' : 1
    );

    return {
        participants: out.participants,
        pending: ctx.pending,
        events: out.messages.length
            ? [dmEvent(round, lineText(out.messages, '; '), targets)]
            : [],
    };
}
