import { z } from 'zod';

import { participantStats } from '../../rules/combat/participant';
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

export const mountedSchema = z
    .object({
        participantId: z.string().min(1),
        mountId: z.string().min(1).optional(),
    })
    .strict();

export type MountedBody = z.infer<typeof mountedSchema>;

const invalid = () =>
    new BattleRuleError('invalid_target', API_ERRORS.MEMBER_NOT_FOUND);

/** DM switch: seats a rider on a mount (or dismounts it); positions are not synced (p168) */
export function mountedMutation(
    ctx: BattleMutationContext,
    body: MountedBody
): MutationResult {
    const rider = findParticipant(ctx.participants, body.participantId);

    const mount = body.mountId
        ? findParticipant(ctx.participants, body.mountId)
        : undefined;

    if (!rider || (body.mountId && (!mount || mount === rider)))
        throw invalid();

    if (!mount && !wfrpState(rider).mounted)
        return { participants: ctx.participants, pending: ctx.pending, events: [] };

    const next = withWfrpState(rider, {
        mounted: mount
            ? {
                  mountId: mount.basicInfo.id,
                  sb: participantStats(mount)?.sb ?? 0,
              }
            : undefined,
    });

    const line = mount
        ? textRef('battleWfrp.log.mounted', {
              name: rider.basicInfo.name,
              mount: mount.basicInfo.name,
          })
        : textRef('battleWfrp.log.dismounted', { name: rider.basicInfo.name });

    return {
        participants: ctx.participants.map((p) => (p === rider ? next : p)),
        pending: ctx.pending,
        events: [
            dmEvent(ctx.scene.round, lineText([line], '; '), [
                {
                    participantId: rider.basicInfo.id,
                    participantName: rider.basicInfo.name,
                },
            ]),
        ],
    };
}
