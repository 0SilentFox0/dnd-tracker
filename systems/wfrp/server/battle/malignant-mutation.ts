import { z } from 'zod';

import { wfrpState, withWfrpState } from '../../rules/state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { lineText } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError, dmEvent } from '@/lib/utils/battle/store';

export const malignantSchema = z
    .object({
        participantId: z.string().min(1),
        on: z.boolean(),
    })
    .strict();

export type MalignantBody = z.infer<typeof malignantSchema>;

export function malignantMutation(
    ctx: BattleMutationContext,
    body: MalignantBody
): MutationResult {
    const target = findParticipant(ctx.participants, body.participantId);

    if (!target)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MEMBER_NOT_FOUND
        );

    if (!!wfrpState(target).malignant === body.on)
        return { participants: ctx.participants, pending: ctx.pending, events: [] };

    const next = withWfrpState(target, {
        malignant: body.on ? true : undefined,
    });

    return {
        participants: ctx.participants.map((p) => (p === target ? next : p)),
        pending: ctx.pending,
        events: [
            dmEvent(
                ctx.scene.round,
                lineText(
                    [
                        textRef(
                            body.on
                                ? 'wfrpMagic.log.malignantOn'
                                : 'wfrpMagic.log.malignantOff',
                            { name: target.basicInfo.name }
                        ),
                    ],
                    '; '
                ),
                [
                    {
                        participantId: target.basicInfo.id,
                        participantName: target.basicInfo.name,
                    },
                ]
            ),
        ],
    };
}
