import { z } from 'zod';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { CONDITION_LIMITS } from '@/lib/constants/battle';
import { MAX_EXHAUSTION } from '@/lib/constants/exhaustion';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
} from '@/lib/utils/abilities/engine/core/participants';
import { CustomConditionKeySchema } from '@/lib/utils/abilities/schema';
import {
    CONDITION_KEY_RE,
    isCustomConditionKey,
} from '@/lib/utils/abilities/schema/kinds';
import {
    PERMANENT_ROUNDS,
    removeStandardCondition,
} from '@/lib/utils/battle/conditions';
import { lineText } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError, dmEvent } from '@/lib/utils/battle/store';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

const ConditionKeySchema = z.union([
    z.string().regex(CONDITION_KEY_RE),
    CustomConditionKeySchema,
]);

export const battleConditionsSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('apply'),
        participantId: z.string().min(1),
        condition: ConditionKeySchema,
        rounds: z.number().int().min(1).max(CONDITION_LIMITS.rounds).optional(),
        levels: z.number().int().min(1).max(MAX_EXHAUSTION).optional(),
        sourceId: z.string().min(1).optional(),
        saveEnds: z
            .object({
                ability: z.enum(ABILITY_KEYS),
                dc: z.number().int().min(1).max(CONDITION_LIMITS.dc),
            })
            .optional(),
    }),
    z.object({
        action: z.literal('remove'),
        participantId: z.string().min(1),
        condition: ConditionKeySchema,
    }),
]);

export type BattleConditionsBody = z.infer<typeof battleConditionsSchema>;

const SOURCE_CONDITIONS: readonly string[] = ['frightened', 'charmed'];

function sourcesFor(
    ps: BattleParticipant[],
    target: BattleParticipant,
    body: Extract<BattleConditionsBody, { action: 'apply' }>
): (string | undefined)[] {
    if (!SOURCE_CONDITIONS.includes(body.condition)) return [undefined];

    if (body.sourceId) {
        if (!findParticipant(ps, body.sourceId))
            throw new BattleRuleError(
                'invalid_target',
                API_ERRORS.MEMBER_NOT_FOUND
            );

        return [body.sourceId];
    }

    // No source picked: the condition holds against every active hostile participant.
    const hostile = ps.filter(
        (p) => isActive(p) && p.basicInfo.side !== target.basicInfo.side
    );

    return hostile.length > 0
        ? hostile.map((p) => p.basicInfo.id)
        : [undefined];
}

function sourceRef(ps: BattleParticipant[], id: string | undefined) {
    const p = id ? findParticipant(ps, id) : undefined;

    return p
        ? { participantId: p.basicInfo.id, name: p.basicInfo.name }
        : undefined;
}

export function battleConditionsMutation(
    ctx: BattleMutationContext,
    body: BattleConditionsBody
): MutationResult {
    const target = findParticipant(ctx.participants, body.participantId);

    if (!target)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MEMBER_NOT_FOUND
        );

    const round = ctx.scene.round;

    const { conditionSet } = ruleSystemOf(ctx.meta.rules);

    if (
        body.action === 'apply' &&
        !isCustomConditionKey(body.condition) &&
        !conditionSet.keys.includes(body.condition)
    )
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.CONDITION_UNKNOWN
        );

    const targets = [
        {
            participantId: target.basicInfo.id,
            participantName: target.basicInfo.name,
        },
    ];

    if (body.action === 'apply') {
        const sourceIds = sourcesFor(ctx.participants, target, body);

        let participants = ctx.participants;

        const messages: LogLine[] = [];

        let blocked = false;

        for (const sid of sourceIds) {
            const result = conditionSet.apply(participants, body.participantId, {
                key: body.condition,
                rounds: body.rounds ?? PERMANENT_ROUNDS,
                permanent: !body.rounds,
                levels: body.levels,
                saveEnds: body.saveEnds,
                source: sourceRef(ctx.participants, sid),
                sourceName: textRef('battleLog.dm.name'),
                timedKey: `dm:${body.condition}@${round}${sid ? `:${sid}` : ''}`,
                round,
                rules: ctx.meta.rules,
            });

            if (result.blocked) blocked = true;

            participants = result.participants;

            if (messages.length === 0) messages.push(...result.messages);
        }

        const result = { participants, messages, blocked };

        if (result.blocked)
            throw new BattleRuleError(
                'invalid_target',
                API_ERRORS.CONDITION_IMMUNE,
                { name: target.basicInfo.name }
            );

        return {
            participants: result.participants,
            pending: ctx.pending,
            events: [dmEvent(round, lineText(result.messages, '; '), targets)],
        };
    }

    const { participants, removed } = removeStandardCondition(
        ctx.participants,
        body.participantId,
        body.condition
    );

    if (removed.length === 0)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.CONDITION_ABSENT,
            { name: target.basicInfo.name }
        );

    return {
        participants,
        pending: ctx.pending,
        events: [
            dmEvent(
                round,
                textRef('battleLog.dm.conditionRemoved', {
                    target: target.basicInfo.name,
                    condition: removed[0].name,
                }),
                targets
            ),
        ],
    };
}
