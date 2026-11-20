import { z } from 'zod';

import { skillTarget } from '../../rules/characteristics/derive';
import {
    grantSecondAttack,
    hasMomentum,
    loseMomentum,
    secondAttackBlocker,
    withMomentum,
} from '../../rules/combat/momentum';
import { participantChars } from '../../rules/combat/participant';
import { selfSlMod, selfTestMod } from '../../rules/conditions/test-mod';
import { editionOf } from '../../rules/edition';
import { resolvePercentileTest } from '../../rules/percentile/resolve';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { assertCanAct } from '@/lib/utils/battle/turn';
import { rngOf } from '@/lib/utils/common/rng';

const base = { participantId: z.string().min(1) };

export const momentumSchema = z
    .discriminatedUnion('mode', [
        z.object({ mode: z.literal('secondAttack'), ...base }),
        z.object({
            mode: z.literal('leadership'),
            ...base,
            allyId: z.string().min(1),
            roll: z.number().int().min(1).max(100).optional(),
            serverRoll: z.boolean().optional(),
        }),
    ])
    .refine(
        (d) => d.mode !== 'leadership' || d.roll !== undefined || d.serverRoll,
        { message: REJECT.rollsRequired, path: ['roll'] }
    );

export type MomentumBody = z.infer<typeof momentumSchema>;

const reject = (
    message: string,
    code: 'action_rejected' | 'invalid_target' = 'action_rejected'
) => new BattleRuleError(code, message);

export function momentumMutation(
    ctx: BattleMutationContext,
    body: MomentumBody
): MutationResult {
    const edition = editionOf(ctx.meta.rules);

    if (edition.momentumModel !== 'participant')
        throw reject(API_ERRORS.MOMENTUM_UNSUPPORTED, 'invalid_target');

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: {
            code: 'action_rejected',
            message: API_ERRORS.MOMENTUM_NONE,
        },
    });

    if (currentOf(ctx)?.basicInfo.id !== actor.basicInfo.id)
        throw reject(API_ERRORS.MOMENTUM_NONE);

    assertCanAct(ctx, actor.basicInfo.id);

    if (!hasMomentum(actor)) throw reject(API_ERRORS.MOMENTUM_NONE);

    const id = actor.basicInfo.id;

    const at = { battleId: ctx.scene.id, round: ctx.scene.round };

    if (body.mode === 'secondAttack') {
        const blocker = secondAttackBlocker(actor, ctx.meta.rules);

        if (blocker === 'used') throw reject(API_ERRORS.MOMENTUM_ATTACK_USED);

        if (blocker) throw reject(API_ERRORS.SECOND_ATTACK_UNAVAILABLE);

        const next = grantSecondAttack(actor);

        const action = newBattleAction(
            actor,
            'ability',
            { ...at, targets: [next] },
            {
                actionDetails: {},
                ...logFields(
                    textRef('battleWfrp.log.momentumSecondAttack', {
                        name: actor.basicInfo.name,
                    })
                ),
            }
        );

        return {
            participants: ctx.participants.map((p) =>
                p.basicInfo.id === id ? next : p
            ),
            pending: ctx.pending,
            events: [battleActionToEvent(action)],
        };
    }

    const ally = ctx.participants.find((p) => p.basicInfo.id === body.allyId);

    if (
        !ally ||
        ally.basicInfo.id === id ||
        ally.basicInfo.side !== actor.basicInfo.side ||
        !isActive(ally)
    )
        throw reject(API_ERRORS.LEADERSHIP_ALLY_INVALID, 'invalid_target');

    const skill = skillTarget(participantChars(actor), 'leadership');

    if (!skill) throw reject(API_ERRORS.LEADERSHIP_SKILL_MISSING);

    const result = resolvePercentileTest({
        target: skill.target + selfTestMod(actor, 'test', edition),
        slModifier: selfSlMod(actor, edition),
        slModel: edition.slModel,
        mode: 'normal',
        rng: rngOf(ctx),
        presetRoll: body.serverRoll ? undefined : body.roll,
    });

    const won = result.outcome === 'success' || result.outcome === 'critical';

    const spent = loseMomentum(actor);

    const participants = ctx.participants.map((p) => {
        if (p.basicInfo.id === id) return spent;

        return won && p.basicInfo.id === ally.basicInfo.id
            ? withMomentum(p, true)
            : p;
    });

    const action = newBattleAction(
        actor,
        'ability',
        { ...at, targets: [spent] },
        {
            actionDetails: {},
            ...logFields(
                won
                    ? textRef('battleWfrp.log.leadershipTransfer', {
                          name: actor.basicInfo.name,
                          ally: ally.basicInfo.name,
                          sl: result.sl,
                      })
                    : textRef('battleWfrp.log.leadershipFailed', {
                          name: actor.basicInfo.name,
                          sl: result.sl,
                      })
            ),
        }
    );

    return {
        participants,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
    };
}
