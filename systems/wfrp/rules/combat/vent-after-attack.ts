import { ventOnAttack } from '../traits/passions';

import type { AfterAttackHook } from '@/lib/utils/rules/systems/types';

/** A strike at the disliked group vents the attacker's Animosity (p183) */
export const wfrpVentAfterAttack: AfterAttackHook = (ctx) => {
    const defender = ctx.participants.find(
        (p) => p.basicInfo.id === ctx.defenderId
    );

    if (!defender) return null;

    const participants = ventOnAttack(ctx.participants, ctx.attackerId, defender);

    return participants === ctx.participants
        ? null
        : { participants, actions: [], sceneState: ctx.sceneState };
};
