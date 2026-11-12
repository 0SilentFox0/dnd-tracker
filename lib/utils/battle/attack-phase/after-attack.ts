import type {
    AfterAttackCtx,
    AfterAttackHook,
    AfterAttackResult,
} from '@/lib/utils/rules/systems/types';

/** Runs the hooks in order, each seeing the previous one's participants and scene state (also through `counterStrike`); `handled` once any hook answered the strike */
export function runAfterAttack(
    list: readonly AfterAttackHook[],
    ctx: AfterAttackCtx
): AfterAttackResult | null {
    let out = null as AfterAttackResult | null;

    for (const hook of list) {
        const participants = out?.participants ?? ctx.participants;

        const sceneState = out ? out.sceneState : ctx.sceneState;

        const r = hook({
            ...ctx,
            participants,
            sceneState,
            handled: out?.handled,
            counterStrike: (provoked, from) =>
                ctx.counterStrike(
                    provoked,
                    from ?? { participants, sceneState }
                ),
        });

        if (!r) continue;

        out = {
            participants: r.participants,
            actions: [...(out?.actions ?? []), ...r.actions],
            sceneState: r.sceneState,
            ...((out?.handled || r.handled) && { handled: true as const }),
        };
    }

    return out;
}
