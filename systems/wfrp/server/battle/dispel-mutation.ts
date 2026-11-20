import { z } from 'zod';

import { isCanonDispel, wfrpDispelPersistent } from '../../rules/magic/dispel';
import { dispelSpotsOf, isDispelRange } from '../../rules/magic/dispel-range';
import { wfrpState, withWfrpState } from '../../rules/state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
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

export const dispelSchema = z
    .object({
        participantId: z.string().min(1),
        targetId: z.string().min(1),
        mode: z.literal('persistent'),
        roll: z.number().int().min(1).max(100).optional(),
        serverRoll: z.literal(true).optional(),
    })
    .strict();

export type DispelBody = z.infer<typeof dispelSchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

export function dispelMutation(
    ctx: BattleMutationContext,
    body: DispelBody
): MutationResult {
    const { rules } = ctx.meta;

    if (!isCanonDispel(rules))
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MOMENTUM_UNSUPPORTED
        );

    const dispeller = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: { code: 'action_rejected', message: API_ERRORS.ACTION_USED },
    });

    const target = findParticipant(ctx.participants, body.targetId);

    if (!target)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE
        );

    if (!isDispelRange(dispeller, dispelSpotsOf(target), ctx.meta.map, rules))
        throw reject(API_ERRORS.DISPEL_OUT_OF_RANGE);

    const id = dispeller.basicInfo.id;

    const round = ctx.scene.round;

    assertCanAct(ctx, id);

    if (dispeller.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    const held = ruleSystemOf(rules).magic.sustain.info(target);

    if (!held?.cn) throw reject(API_ERRORS.DISPEL_NO_TARGET);

    const before = wfrpState(dispeller).dispelProgress;

    const result = wfrpDispelPersistent({
        dispeller,
        spellName: held.spellName,
        progress:
            before?.targetId === target.basicInfo.id &&
            before.castId === held.castId
                ? before.progress
                : 0,
        cn: held.cn,
        ownSpell: target.basicInfo.id === id,
        rules,
        rng: rngOf(ctx),
        presetRoll: body.serverRoll ? undefined : body.roll,
    });

    const next = withWfrpState(applyMainActionUsed(dispeller), {
        dispelProgress: result.done
            ? undefined
            : {
                  targetId: target.basicInfo.id,
                  castId: held.castId,
                  progress: result.progress,
              },
    });

    let participants = ctx.participants.map((p) =>
        p === dispeller ? next : p
    );

    let lines = result.lines;

    if (result.done) {
        const ended = ruleSystemOf(rules).magic.sustain.drop(
            participants,
            target.basicInfo.id,
            result.lines[0]
        );

        participants = ended.participants;
        lines = [...lines, ...ended.messages];
    }

    const action = newBattleAction(
        dispeller,
        'ability',
        { battleId: ctx.scene.id, round, targets: [next] },
        { actionDetails: {}, ...logFields(lineText(lines, ' | ')) }
    );

    return {
        participants,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
    };
}
