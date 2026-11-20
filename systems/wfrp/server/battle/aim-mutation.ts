import { z } from 'zod';

import { withWfrpState } from '../../rules/state';
import { actorOnTurn, applyChanges, reject, requireCanon } from './own-turn';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';

export const aimSchema = z
    .object({
        participantId: z.string().min(1),
        targetId: z.string().min(1),
    })
    .strict();

export type AimBody = z.infer<typeof aimSchema>;

/** Aim (an Action): +1 SL to the next ranged attack on this target, lost by any other action or movement (p165) */
export function aimMutation(
    ctx: BattleMutationContext,
    body: AimBody
): MutationResult {
    requireCanon(ctx);

    const actor = actorOnTurn(ctx, body.participantId);

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

    return applyChanges(
        ctx,
        actor,
        [next],
        textRef('battleWfrp.log.aimed', {
            name: actor.basicInfo.name,
            target: target.basicInfo.name,
        })
    );
}
