import { z } from 'zod';

import { skillTarget } from '../../rules/characteristics/derive';
import {
    armourPenaltyFor,
    participantChars,
} from '../../rules/combat/participant';
import {
    selfModes,
    selfSlMod,
    selfTestMod,
} from '../../rules/conditions/test-mod';
import { editionOf } from '../../rules/edition';
import { resolvePercentileTest } from '../../rules/percentile';
import { resolveModeSources } from '../../rules/percentile/advantage';
import { wfrpState, withWfrpState } from '../../rules/state';
import { isFrenzied } from '../../rules/traits/frenzy';
import {
    animosityToward,
    hatesTarget,
    isPsychImmune,
} from '../../rules/traits/passions';
import { coolTarget } from '../../rules/traits/psych-test';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { inPlay } from '@/lib/utils/abilities/engine/core/participants';
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
import { REJECT } from '@/lib/utils/battle/store/reject';
import { assertCanAct } from '@/lib/utils/battle/turn';
import { rngOf } from '@/lib/utils/common/rng';

export const intimidateSchema = z
    .object({
        participantId: z.string().min(1),
        targetId: z.string().min(1),
        roll: z.number().int().min(1).max(100).optional(),
        serverRoll: z.boolean().optional(),
    })
    .strict();

export type IntimidateBody = z.infer<typeof intimidateSchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

/** Intimidate in Combat (p169): an action, Intimidate against the target's Cool; a win makes the target fear the actor, rating 1 plus 1 per SL after the first. Hatred is immune to its hated foe (p184); Animosity puts Fellowship tests against its group at Disadvantage (p183). */
export function intimidateMutation(
    ctx: BattleMutationContext,
    body: IntimidateBody
): MutationResult {
    const edition = editionOf(ctx.meta.rules);

    if (edition.psychologyModel !== 'extended')
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

    if (
        !target ||
        target.basicInfo.id === actor.basicInfo.id ||
        !inPlay(target) ||
        !isHostile(ctx.meta.map, actor, target)
    )
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE
        );

    if (hatesTarget(target, actor))
        throw reject(API_ERRORS.INTIMIDATE_IMMUNE);

    if (body.roll === undefined && !body.serverRoll)
        throw reject(REJECT.rollsRequired);

    const skill = skillTarget(participantChars(actor), 'intimidate');

    if (!skill) throw reject(API_ERRORS.INTIMIDATE_SKILL_MISSING);

    const modes = selfModes(actor, 'test', edition);

    const mode = resolveModeSources({
        ...modes,
        disadvantage:
            (modes.disadvantage ?? 0) + (animosityToward(actor, target) ? 1 : 0),
    });

    const rng = rngOf(ctx);

    const own = resolvePercentileTest({
        target: skill.target + selfTestMod(actor, 'test', edition),
        slModifier:
            selfSlMod(actor, edition) +
            armourPenaltyFor(actor, 'intimidate') +
            mode.slMod,
        slModel: edition.slModel,
        mode: mode.mode,
        rng,
        presetRoll: body.serverRoll ? undefined : body.roll,
    });

    const foe = resolvePercentileTest({
        target: coolTarget(target) + selfTestMod(target, 'test', edition),
        slModifier: selfSlMod(target, edition),
        slModel: edition.slModel,
        mode: 'normal',
        rng,
    });

    const won = own.sl >= foe.sl && own.outcome !== 'failure' && own.outcome !== 'fumble';

    const rating = Math.max(1, own.sl - foe.sl);

    const frightened =
        won && !isFrenzied(target) && !isPsychImmune(ctx.participants, body.targetId, ctx.meta.rules);

    const used = applyMainActionUsed(actor);

    const round = ctx.scene.round;

    const names = {
        name: actor.basicInfo.name,
        target: target.basicInfo.name,
        sl: own.sl,
        foeSl: foe.sl,
    };

    const line = !won
        ? textRef('battleWfrp.log.intimidateLose', names)
        : frightened
          ? textRef('battleWfrp.log.intimidateWin', {
                ...names,
                roll: own.roll,
                own: skill.target,
                rating,
            })
          : textRef('battleWfrp.log.intimidateNoEffect', names);

    const id = actor.basicInfo.id;

    const participants = ctx.participants.map((p) => {
        if (p.basicInfo.id === id) return used;

        if (!frightened || p.basicInfo.id !== body.targetId) return p;

        const held = wfrpState(p).fear?.[id];

        return withWfrpState(p, {
            fear: {
                ...wfrpState(p).fear,
                [id]: {
                    rating: Math.max(rating, held?.rating ?? 0),
                    sl: held?.sl ?? 0,
                    round,
                },
            },
        });
    });

    return {
        participants,
        pending: ctx.pending,
        events: [
            battleActionToEvent(
                newBattleAction(
                    actor,
                    'ability',
                    {
                        battleId: ctx.scene.id,
                        round,
                        targets: [
                            participants.find(
                                (p) => p.basicInfo.id === body.targetId
                            )!,
                        ],
                    },
                    { actionDetails: {}, ...logFields(line) }
                )
            ),
        ],
    };
}
