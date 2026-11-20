import { z } from 'zod';

import { editionOf } from '../../rules/edition';
import { withWfrpState } from '../../rules/state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
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

/** Aimed Shot (p167): an Action spent aiming gives +1 SL on the next ranged attack at that target */
export function aimMutation(
    ctx: BattleMutationContext,
    body: AimBody
): MutationResult {
    if (editionOf(ctx.meta.rules).combatModsModel !== 'canon5e')
        throw new BattleRuleError('invalid_target', API_ERRORS.AIM_UNSUPPORTED);

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: { code: 'action_rejected', message: API_ERRORS.ACTION_USED },
    });

    assertCanAct(ctx, actor.basicInfo.id);

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    const target = ctx.participants.find(
        (p) => p.basicInfo.id === body.targetId
    );

    if (
        !target ||
        !isActive(target) ||
        target.basicInfo.side === actor.basicInfo.side
    )
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.ABILITY_TARGET_INVALID
        );

    if (
        !actor.battleData.attacks.some(
            (a) => attackKindOf(a.type) === AttackType.RANGED
        )
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.AIM_NO_RANGED_WEAPON
        );

    const aimed = applyMainActionUsed(
        withWfrpState(actor, {
            aim: {
                targetId: target.basicInfo.id,
                movementUsed: actor.battleData.movementUsed ?? 0,
            },
        })
    );

    return {
        participants: ctx.participants.map((p) =>
            p.basicInfo.id === aimed.basicInfo.id ? aimed : p
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
                        targets: [aimed],
                    },
                    {
                        actionDetails: {},
                        ...logFields(
                            textRef('battleWfrp.log.aim', {
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
