import type { AfterAttackHook } from '@/lib/utils/rules/systems/types';

/** A critical effect that provokes the target: it answers with a free strike, outside its reaction accounting */
export const d20ProvokedOpportunity: AfterAttackHook = (ctx) => {
    if (ctx.criticalEffect?.effect.type !== 'provoke_opportunity_attack')
        return null;

    const answer = ctx.counterStrike(true);

    return {
        participants: answer?.participants ?? ctx.participants,
        actions: answer?.actions ?? [],
        sceneState: answer ? answer.sceneState : ctx.sceneState,
        handled: true,
    };
};
