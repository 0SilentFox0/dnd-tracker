import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    findParticipant,
    isActive,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { resolveDowned } from '@/lib/utils/abilities/engine/core/run-abilities';
import { appendHpChanges } from '@/lib/utils/battle/common/action-flow';
import { requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { lineText, logFields } from '@/lib/utils/battle/log/lines';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { assertCanAct } from '@/lib/utils/battle/turn';
import { rngOf } from '@/lib/utils/common/rng';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

export const channelSchema = z.object({
    participantId: z.string().min(1),
    roll: z.number().int().min(1).max(100).optional(),
    serverRoll: z.literal(true).optional(),
});

export type ChannelBody = z.infer<typeof channelSchema>;

export function channelMutation(
    ctx: BattleMutationContext,
    body: ChannelBody
): MutationResult {
    const magic = ruleSystemOf(ctx.meta.rules).magic.tested;

    if (!magic)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_CHANNEL_UNSUPPORTED
        );

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: { code: 'action_rejected', message: API_ERRORS.ACTION_USED },
    });

    assertCanAct(ctx, actor.basicInfo.id);

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    const round = ctx.scene.round;

    const rng = rngOf(ctx);

    const channelled = magic.channel(actor, {
        rules: ctx.meta.rules,
        rng,
        presetRoll: body.serverRoll ? undefined : body.roll,
    });

    let participants = replaceParticipant(
        ctx.participants,
        applyMainActionUsed(channelled.participant)
    );

    const lines = [...channelled.lines];

    if (channelled.miscast) {
        const r = magic.miscast(
            participants,
            actor.basicInfo.id,
            channelled.miscast,
            {
                round,
                rng,
                rules: ctx.meta.rules,
                applyDamage: applyDamageConsequences,
            }
        );

        participants = r.participants;
        lines.push(...r.messages);

        if (
            !isActive(
                findParticipant(participants, actor.basicInfo.id) ?? actor
            )
        ) {
            const downed = resolveDowned(
                participants,
                { victimId: actor.basicInfo.id, actorId: null },
                { round, rng, rules: ctx.meta.rules }
            );

            participants = downed.participants;
            lines.push(...downed.messages);
        }
    }

    const updated =
        participants.find((p) => p.basicInfo.id === actor.basicInfo.id) ??
        actor;

    const action = newBattleAction(
        actor,
        'ability',
        { battleId: ctx.scene.id, round, targets: [updated] },
        { actionDetails: {}, ...logFields(lineText(lines, ' | ')) }
    );

    appendHpChanges(action, ctx.participants, participants);

    return {
        participants,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
    };
}
