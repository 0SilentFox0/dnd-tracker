import { z } from 'zod';

import { engagedFoes, engagementJournal } from '../../rules/combat/engagement';
import { withMomentum } from '../../rules/combat/momentum';
import { applyWfrpConditionTo } from '../../rules/conditions/apply';
import { editionOf } from '../../rules/edition';
import { wfrpState, withWfrpState } from '../../rules/state';
import { actorOnTurn, applyChanges, reject, requireCanon } from './own-turn';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';

export const fleeSchema = z.object({ participantId: z.string().min(1) }).strict();

export type FleeBody = z.infer<typeof fleeSchema>;

/** Flee (p163): a Move that needs no Disengage, even Surrounded; each Engaged foe gains Momentum and the runner takes a Broken level per foe */
export function fleeMutation(
    ctx: BattleMutationContext,
    body: FleeBody
): MutationResult {
    const { rules, map } = ctx.meta;

    requireCanon(ctx);

    const edition = editionOf(rules);

    const actor = actorOnTurn(ctx, body.participantId);

    if (wfrpState(actor).moveMode) throw reject(API_ERRORS.MOVE_MODE_CHOSEN);

    const foes = engagedFoes(actor, ctx.participants, map, engagementJournal(rules));

    if (foes.length === 0) throw reject(API_ERRORS.DISENGAGE_NOT_ENGAGED);

    const broken = applyWfrpConditionTo(
        withWfrpState(actor, { moveMode: 'flee', aim: undefined }),
        {
            key: 'broken',
            levels: foes.length,
            round: ctx.scene.round,
            edition,
            sourceName: actor.basicInfo.name,
        }
    );

    const foeIds = new Set(foes.map((f) => f.basicInfo.id));

    const angered = ctx.participants
        .filter((p) => foeIds.has(p.basicInfo.id))
        .map((p) => withMomentum(p, true));

    return applyChanges(
        ctx,
        actor,
        [broken.participant, ...angered],
        textRef('battleWfrp.log.fled', {
            name: actor.basicInfo.name,
            foes: foes.length,
        })
    );
}
