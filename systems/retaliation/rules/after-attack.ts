import { retaliationRules } from './access';
import { retaliationStateData, retaliationUsed } from './state';

import { findFlagsMany } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    findParticipant,
    replaceParticipant,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import type { AfterAttackHook } from '@/lib/utils/rules/systems/types';

/** The target answers the volley's first strike once per reaction (extra and unlimited retaliations lift the limit) */
export const retaliationAfterAttack: AfterAttackHook = (ctx) => {
    if (
        !ctx.first ||
        ctx.handled ||
        ctx.critFail ||
        retaliationRules(ctx.rules).retaliation === false
    )
        return null;

    const defender = findParticipant(ctx.participants, ctx.defenderId);

    if (!defender) return null;

    const flags = findFlagsMany(
        withSelf(ctx.participants, defender),
        ctx.defenderId,
        ['unlimitedRetaliation', 'extraRetaliations']
    );

    const unlimited = flags.unlimitedRetaliation.length > 0;

    const allowed =
        1 + flags.extraRetaliations.reduce((n, f) => n + f.count, 0);

    const used = retaliationUsed(defender);

    if (!unlimited && (defender.actionFlags.hasUsedReaction || used >= allowed))
        return null;

    const counted = unlimited
        ? ctx.participants
        : replaceParticipant(ctx.participants, {
              ...defender,
              battleData: {
                  ...defender.battleData,
                  ...retaliationStateData(defender, used + 1),
              },
              actionFlags: {
                  ...defender.actionFlags,
                  hasUsedReaction: used + 1 >= allowed,
              },
          });

    const answer = ctx.counterStrike(false, {
        participants: counted,
        sceneState: ctx.sceneState,
    });

    return answer && { ...answer, handled: true };
};
