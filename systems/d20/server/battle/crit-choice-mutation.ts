import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import type { CritChoiceBody } from '@/lib/schemas';
import type { SpellRequestData } from '@/lib/schemas/battles';
import type { AttackBody } from '@/lib/server/battles/mutations/attack/attack-mutation';
import type { BattleOperationDeps } from '@/lib/server/systems/types';
import { enabledCritEffects } from '@/lib/utils/battle/crit-choice/catalog';
import { critPendingOf } from '@/lib/utils/battle/crit-choice/pending';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError, dmEvent } from '@/lib/utils/battle/store';

export type CritChoiceDeps = BattleOperationDeps;

export function createCritChoiceMutation(deps: CritChoiceDeps) {
    return async (
        ctx: BattleMutationContext,
        body: CritChoiceBody
    ): Promise<MutationResult> => {
        const pending = critPendingOf(ctx.scene.pendingChoice);

        if (!pending)
            throw new BattleRuleError(
                'action_rejected',
                API_ERRORS.CRIT_CHOICE_NONE
            );

        if ('cancel' in body) {
            return {
                participants: ctx.participants,
                pending: ctx.pending,
                events: [
                    dmEvent(ctx.scene.round, textRef('battleLog.dm.cancelled')),
                ],
                scene: { pendingChoice: null },
            };
        }

        const triggers = new Map(pending.shown.triggers.map((t) => [t.key, t]));

        const keys = Object.keys(body.choices);

        if (
            keys.length !== triggers.size ||
            keys.some((k) => !triggers.has(k))
        ) {
            throw new BattleRuleError(
                'action_rejected',
                API_ERRORS.CRIT_CHOICE_INCOMPLETE
            );
        }

        const choices: Record<string, number> = {};

        for (const [key, choice] of Object.entries(body.choices)) {
            if (choice === 'random') continue;

            const trigger = triggers.get(key)!;

            if (
                !enabledCritEffects(trigger.source, trigger.kind, {
                    success: ctx.meta.rules.criticals.disabledSuccess,
                    fail: ctx.meta.rules.criticals.disabledFail,
                }).some((e) => e.id === choice)
            )
                throw new BattleRuleError(
                    'action_rejected',
                    API_ERRORS.CRIT_EFFECT_UNKNOWN
                );

            choices[key] = choice;
        }

        const { hidden } = pending;

        const resume = { seed: hidden.seed, choices };

        const requester = { ...ctx, userId: hidden.userId, isDM: hidden.isDM };

        return pending.shown.action === 'attack'
            ? deps.attack(requester, hidden.request as AttackBody, resume, {
                  serverRolls: hidden.serverRolls,
              })
            : deps.spell(requester, hidden.request as SpellRequestData, resume);
    };
}
