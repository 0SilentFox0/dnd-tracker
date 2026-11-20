import { z } from 'zod';

import { editionOf } from '../../rules/edition';
import { wfrpState } from '../../rules/state';
import {
    animosityDue,
    groupLabel,
    releasePassion,
    ventAnimosity,
} from '../../rules/traits/passions';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { logFields } from '@/lib/utils/battle/log/lines';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { BattleAccessError } from '@/lib/utils/battle/store/errors';

export const passionSchema = z
    .object({
        participantId: z.string().min(1),
        mode: z.enum(['vent', 'release']),
        key: z.string().min(1).optional(),
    })
    .strict();

export type PassionBody = z.infer<typeof passionSchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

/** `vent`: the compelled fighter insults, provokes or attacks the disliked group; `release`: the GM waives a failed Hatred or Animosity test (p183-184) */
export function passionMutation(
    ctx: BattleMutationContext,
    body: PassionBody
): MutationResult {
    if (editionOf(ctx.meta.rules).psychologyModel !== 'extended')
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MOMENTUM_UNSUPPORTED
        );

    if (body.mode === 'release' && !ctx.isDM)
        throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        anyTurn: body.mode === 'release',
    });

    if (body.mode === 'vent' && currentOf(ctx)?.basicInfo.id !== body.participantId)
        throw reject(API_ERRORS.ACTION_USED);

    const entries = Object.entries(wfrpState(actor).compelled ?? {}).filter(
        ([key, e]) =>
            (body.mode === 'release' || e.kind === 'animosity') &&
            (!body.key || key === body.key)
    );

    const due =
        body.mode === 'vent'
            ? animosityDue(ctx.participants, actor, ctx.meta.map)
            : entries.map(([key, e]) => ({ key, group: e.group }));

    if (due.length === 0) throw reject(API_ERRORS.PASSION_NOTHING_TO_VENT);

    const next = due.reduce(
        (p, { key, group }) =>
            body.mode === 'vent' ? ventAnimosity(p, group) : releasePassion(p, key),
        actor
    );

    const lines = due.map(({ key, group }) =>
        body.mode === 'vent'
            ? textRef('battleWfrp.log.animosityVent', {
                  name: actor.basicInfo.name,
                  group: groupLabel(group),
              })
            : textRef('battleWfrp.log.passionRelease', {
                  name: actor.basicInfo.name,
                  passion: dynamicTextRef(
                      `battleWfrp.passion.${key.split(':')[0]}`
                  ),
                  group: groupLabel(group),
              })
    );

    return {
        participants: ctx.participants.map((p) =>
            p.basicInfo.id === actor.basicInfo.id ? next : p
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
                    { actionDetails: {}, ...logFields(lines) }
                )
            ),
        ],
    };
}
