import { z } from 'zod';

import { DEFENSIVE_SKILLS } from '../../rules/combat/defensive';
import { withWfrpState } from '../../rules/state';
import { actorOnTurn, applyChanges, requireCanon } from './own-turn';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';

export const defensiveSchema = z
    .object({
        participantId: z.string().min(1),
        skill: z.enum(DEFENSIVE_SKILLS),
    })
    .strict();

export type DefensiveBody = z.infer<typeof defensiveSchema>;

const LOG = {
    parry: (name: string) => textRef('battleWfrp.log.defensiveParry', { name }),
    dodge: (name: string) => textRef('battleWfrp.log.defensiveDodge', { name }),
    magick: (name: string) =>
        textRef('battleWfrp.log.defensiveMagick', { name }),
};

/** On the Defensive (an Action): +2 SL on the chosen defence until the fighter's next turn; any Aim is lost (p162) */
export function defensiveMutation(
    ctx: BattleMutationContext,
    body: DefensiveBody
): MutationResult {
    requireCanon(ctx);

    const actor = actorOnTurn(ctx, body.participantId);

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    const next = withWfrpState(applyMainActionUsed(actor), {
        defensive: { skill: body.skill },
        aim: undefined,
    });

    return applyChanges(
        ctx,
        actor,
        [next],
        LOG[body.skill](actor.basicInfo.name)
    );
}
