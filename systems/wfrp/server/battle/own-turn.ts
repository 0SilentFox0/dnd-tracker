import { editionOf } from '../../rules/edition';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { assertCanAct } from '@/lib/utils/battle/turn';
import type { BattleParticipant } from '@/types/battle';
import type { TextRef } from '@/types/text';

export const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

export function requireCanon(ctx: BattleMutationContext): void {
    if (editionOf(ctx.meta.rules).actionsModel !== 'canon')
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MOMENTUM_UNSUPPORTED
        );
}

/** The participant whose turn it is, able to act and controlled by the caller */
export function actorOnTurn(
    ctx: BattleMutationContext,
    participantId: string
): BattleParticipant {
    const actor = requireActor(ctx, participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: { code: 'action_rejected', message: API_ERRORS.ACTION_USED },
    });

    if (currentOf(ctx)?.basicInfo.id !== actor.basicInfo.id)
        throw reject(API_ERRORS.ACTION_USED);

    assertCanAct(ctx, actor.basicInfo.id);

    return actor;
}

/** Replaces the changed participants and logs one line against `actor` */
export function applyChanges(
    ctx: BattleMutationContext,
    actor: BattleParticipant,
    changed: BattleParticipant[],
    line: TextRef
): MutationResult {
    const byId = new Map(changed.map((p) => [p.basicInfo.id, p]));

    return {
        participants: ctx.participants.map(
            (p) => byId.get(p.basicInfo.id) ?? p
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
                        targets: changed,
                    },
                    { actionDetails: {}, ...logFields(line) }
                )
            ),
        ],
    };
}
