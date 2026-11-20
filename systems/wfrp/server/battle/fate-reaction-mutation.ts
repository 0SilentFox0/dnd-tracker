import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { AttackBody } from '@/lib/server/battles/mutations/attack/attack-mutation';
import type { BattleOperationDeps } from '@/lib/server/systems/types';
import { critPendingOf } from '@/lib/utils/battle/crit-choice/pending';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleAccessError, BattleRuleError } from '@/lib/utils/battle/store';

export const fateReactionSchema = z.object({
    answers: z.record(z.string().max(120), z.boolean()),
});

export type FateReactionBody = z.infer<typeof fateReactionSchema>;

export type FateReactionDeps = Pick<BattleOperationDeps, 'attack'>;

export function createFateReactionMutation(deps: FateReactionDeps) {
    return async (
        ctx: BattleMutationContext,
        body: FateReactionBody
    ): Promise<MutationResult> => {
        const pending = critPendingOf(ctx.scene.pendingChoice);

        const negations = pending?.shown.negations ?? [];

        if (!pending || negations.length === 0)
            throw new BattleRuleError(
                'action_rejected',
                API_ERRORS.FATE_REACTION_NONE
            );

        const controlsAll = negations.every(
            (n) =>
                ctx.participants.find((p) => p.basicInfo.id === n.holderId)
                    ?.basicInfo.controlledBy === ctx.userId
        );

        if (!ctx.isDM && !controlsAll)
            throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

        const offered = new Set(negations.map((n) => n.key));

        const keys = Object.keys(body.answers);

        if (keys.length !== offered.size || keys.some((k) => !offered.has(k)))
            throw new BattleRuleError(
                'action_rejected',
                API_ERRORS.CRIT_CHOICE_INCOMPLETE
            );

        const { hidden } = pending;

        const requester = { ...ctx, userId: hidden.userId, isDM: hidden.isDM };

        return deps.attack(
            requester,
            hidden.request as AttackBody,
            {
                seed: hidden.seed,
                choices: {},
                riderChoices: {},
                negateChoices: body.answers,
            },
            { serverRolls: hidden.serverRolls }
        );
    };
}
