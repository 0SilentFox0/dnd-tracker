import { z } from 'zod';

import { value } from '../../rules/characteristics/derive';
import { MIN_DAMAGE } from '../../rules/combat/constants';
import { hitLocation } from '../../rules/combat/location';
import { participantChars, participantStats } from '../../rules/combat/participant';
import {
    applyWfrpConditionTo,
    reduceWfrpCondition,
} from '../../rules/conditions/apply';
import { conditionLevel } from '../../rules/conditions/levels';
import { selfModes, selfSlMod, selfTestMod } from '../../rules/conditions/test-mod';
import { editionOf } from '../../rules/edition';
import { resolvePercentileTest } from '../../rules/percentile';
import { resolveModeSources } from '../../rules/percentile/advantage';
import { wfrpState, withWfrpState } from '../../rules/state';
import { isBiggerThan, sizeOpposedStrength } from '../../rules/traits/size';
import { actorOnTurn, applyChanges, reject, requireCanon } from './own-turn';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { dropBreakOnDamage } from '@/lib/utils/abilities/engine/effects/hp';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { type Rng, rngOf } from '@/lib/utils/common/rng';
import type { BattleParticipant } from '@/types/battle';

export const GRAPPLE_CHOICES = ['damage', 'entangle', 'free'] as const;

export const grappleSchema = z
    .object({
        participantId: z.string().min(1),
        choice: z.enum(GRAPPLE_CHOICES),
        roll: z.number().int().min(1).max(100).optional(),
        serverRoll: z.boolean().optional(),
    })
    .strict();

export type GrappleBody = z.infer<typeof grappleSchema>;

const released = (p: BattleParticipant) =>
    withWfrpState(p, { grapple: undefined });

/** Opposed Strength between the fighters; size can decide it outright (p360) */
function strengthContest(
    actor: BattleParticipant,
    foe: BattleParticipant,
    edition: ReturnType<typeof editionOf>,
    rng: Rng,
    presetRoll?: number
): { won: boolean; sl: number; rawRoll: number } {
    const roll = (p: BattleParticipant, preset?: number) => {
        const modes = resolveModeSources(selfModes(p, 'test', edition));

        return resolvePercentileTest({
            target:
                value(participantChars(p), 's') + selfTestMod(p, 'test', edition),
            slModifier: selfSlMod(p, edition) + modes.slMod,
            slModel: edition.slModel,
            mode: modes.mode,
            rng,
            presetRoll: preset,
        });
    };

    const own = roll(actor, presetRoll);

    const other = roll(foe);

    const net = Math.max(own.sl - other.sl, 0);

    const size = sizeOpposedStrength(actor, foe);

    const bigger = isBiggerThan(actor, foe);

    const higher =
        edition.opposedModel === 'higherSl'
            ? own.sl >= other.sl
            : (own.outcome === 'success' || own.outcome === 'critical') &&
              own.sl > other.sl;

    const rawRoll = own.rawRoll;

    if (size === 'auto') return { won: bigger, sl: net, rawRoll };

    if (size === 'critOnly' && !bigger)
        return { won: own.outcome === 'critical' && higher, sl: net, rawRoll };

    return { won: higher, sl: net, rawRoll };
}

/** The action of a grappler on its turn: Opposed Strength, then wound the foe, tighten the hold or break free (p167) */
export function grappleMutation(
    ctx: BattleMutationContext,
    body: GrappleBody
): MutationResult {
    requireCanon(ctx);

    const edition = editionOf(ctx.meta.rules);

    const actor = actorOnTurn(ctx, body.participantId);

    const held = wfrpState(actor).grapple;

    if (!held) throw reject(API_ERRORS.ABILITY_TARGET_INVALID);

    const foe = findParticipant(ctx.participants, held.with);

    if (!foe || !isActive(foe))
        return applyChanges(
            ctx,
            actor,
            [released(actor)],
            textRef('battleWfrp.log.grappleLost', { name: actor.basicInfo.name })
        );

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    if (body.roll === undefined && !body.serverRoll)
        throw reject(REJECT.rollsRequired);

    const rng = rngOf(ctx);

    const contest = strengthContest(
        actor,
        foe,
        edition,
        rng,
        body.serverRoll ? undefined : body.roll
    );

    const used = applyMainActionUsed(actor);

    const params = {
        name: actor.basicInfo.name,
        target: foe.basicInfo.name,
        sl: contest.sl,
    };

    if (!contest.won)
        return applyChanges(ctx, actor, [used], textRef('battleWfrp.log.grappleFailed', params));

    if (body.choice === 'free') {
        const loosened = reduceWfrpCondition(
            used,
            'entangled',
            1 + Math.max(contest.sl - 1, 0)
        ).participant;

        const clear = conditionLevel(loosened, 'entangled') === 0;

        return applyChanges(
            ctx,
            actor,
            clear ? [released(loosened), released(foe)] : [loosened],
            textRef('battleWfrp.log.grappleFree', params)
        );
    }

    if (body.choice === 'entangle') {
        const tightened = applyWfrpConditionTo(foe, {
            key: 'entangled',
            levels: 1 + Math.max(contest.sl - 1, 0),
            round: ctx.scene.round,
            edition,
            sourceName: actor.basicInfo.name,
        }).participant;

        return applyChanges(ctx, actor, [used, tightened], textRef('battleWfrp.log.grappleEntangle', params));
    }

    const amount = Math.max(
        MIN_DAMAGE,
        (participantStats(actor)?.sb ?? 0) +
            contest.sl -
            (participantStats(foe)?.tb ?? 0)
    );

    const location = hitLocation(
        contest.rawRoll,
        edition.hitLocationModel === 'side'
    );

    const after = dropBreakOnDamage(
        {
            ...foe,
            combatStats: {
                ...foe.combatStats,
                currentHp: Math.max(0, foe.combatStats.currentHp - amount),
            },
        },
        amount
    );

    const hurt = applyDamageConsequences({
        before: foe,
        after,
        amount,
        location,
        rules: ctx.meta.rules,
        rng,
        participants: replaceParticipant(ctx.participants, after),
        round: ctx.scene.round,
    });

    return applyChanges(
        ctx,
        actor,
        [used, hurt.participant],
        textRef('battleWfrp.log.grappleDamage', { ...params, damage: amount })
    );
}
