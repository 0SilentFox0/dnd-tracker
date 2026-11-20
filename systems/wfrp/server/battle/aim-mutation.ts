import { z } from 'zod';

import { editionOf } from '../../rules/edition';
import { withWfrpState } from '../../rules/state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { assertCanAct } from '@/lib/utils/battle/turn';

export const aimSchema = z
    .object({
        participantId: z.string().min(1),
        targetId: z.string().min(1),
    })
    .strict();

export type AimBody = z.infer<typeof aimSchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

/** Aim (an Action): +1 SL to the next ranged attack on this target, lost by any other action or movement (p165) */
export function aimMutation(
    ctx: BattleMutationContext,
    body: AimBody
): MutationResult {
    if (editionOf(ctx.meta.rules).actionsModel !== 'canon')
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
        throw reject(API_ERRORS.ACTION_USED);

    assertCanAct(ctx, actor.basicInfo.id);

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    const target = ctx.participants.find(
        (p) => p.basicInfo.id === body.targetId
    );

    const armed = (actor.battleData.attacks ?? []).some(
        (a) => attackKindOf(a.type) === AttackType.RANGED
    );

    if (!target || !armed || !isHostile(ctx.meta.map, actor, target))
        throw reject(API_ERRORS.ABILITY_TARGET_INVALID);

    const next = withWfrpState(applyMainActionUsed(actor), {
        aim: { targetId: target.basicInfo.id },
    });

    return {
        participants: ctx.participants.map((p) =>
            p.basicInfo.id === next.basicInfo.id ? next : p
        ),
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
                    {
                        actionDetails: {},
                        ...logFields(
                            textRef('battleWfrp.log.aimed', {
                                name: actor.basicInfo.name,
                                target: target.basicInfo.name,
                            })
                        ),
                    }
                )
            ),
        ],
    };
}
