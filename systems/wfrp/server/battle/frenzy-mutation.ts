import { z } from 'zod';

import { editionOf } from '../../rules/edition';
import { tryEnterFrenzy } from '../../rules/traits/passions';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { rngOf } from '@/lib/utils/common/rng';

export const frenzySchema = z
    .object({
        participantId: z.string().min(1),
        roll: z.number().int().min(1).max(100).optional(),
        serverRoll: z.boolean().optional(),
    })
    .strict();

export type FrenzyBody = z.infer<typeof frenzySchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

/** Manual entry into a Frenzy on the fighter's own turn: a Willpower test, one try per turn (p184) */
export function frenzyMutation(
    ctx: BattleMutationContext,
    body: FrenzyBody
): MutationResult {
    if (editionOf(ctx.meta.rules).psychologyModel !== 'extended')
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MOMENTUM_UNSUPPORTED
        );

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: { code: 'action_rejected', message: API_ERRORS.ACTION_USED },
    });

    if (currentOf(ctx)?.basicInfo.id !== actor.basicInfo.id)
        throw reject(API_ERRORS.FRENZY_CANNOT_ENTER);

    if (body.roll === undefined && !body.serverRoll)
        throw reject(REJECT.rollsRequired);

    const result = tryEnterFrenzy(ctx.participants, actor.basicInfo.id, {
        round: ctx.scene.round,
        rng: rngOf(ctx),
        rules: ctx.meta.rules,
        map: ctx.meta.map,
        presetRoll: body.serverRoll ? undefined : body.roll,
    });

    if (!result) throw reject(API_ERRORS.FRENZY_CANNOT_ENTER);

    const next = result.participants.find(
        (p) => p.basicInfo.id === actor.basicInfo.id
    )!;

    return {
        participants: result.participants,
        pending: ctx.pending,
        events: [
            battleActionToEvent(
                newBattleAction(
                    actor,
                    'ability',
                    {
                        battleId: ctx.scene.id,
                        round: ctx.scene.round,
                        targets: [next],
                    },
                    { actionDetails: {}, ...logFields(result.messages) }
                )
            ),
        ],
    };
}
