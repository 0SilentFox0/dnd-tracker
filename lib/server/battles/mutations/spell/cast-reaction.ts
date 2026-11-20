import { counterSeed } from '@/lib/server/battles/mutations/spell/cast-counter';
import {
    executeCast,
    runsCastTest,
} from '@/lib/server/battles/mutations/spell/cast-execute';
import type { CastPlan } from '@/lib/server/battles/mutations/spell/cast-types';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { openCounterWindow } from '@/lib/utils/battle/counter/pending';
import { createCritGate } from '@/lib/utils/battle/crit-choice/gate';
import { controlledByDm } from '@/lib/utils/battle/participant/unit-control';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { mulberry32 } from '@/lib/utils/common/rng';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

/**
 * Pauses a tested cast for the rule system's reaction window.
 * The cast is first rolled as a probe with a fixed seed; the real run replays that seed.
 * Returns the paused result, `{ seed }` when no window opens (run the cast with it), or null.
 */
export async function openCastReactionIfAny(
    plan: CastPlan
): Promise<MutationResult | { seed: number } | null> {
    const { ctx, caster, order, spell, data } = plan;

    const reaction = ruleSystemOf(ctx.meta.rules).magic.tested?.reaction;

    if (!reaction || !runsCastTest(plan)) return null;

    const args = {
        casterId: caster.basicInfo.id,
        participants: order,
        rules: ctx.meta.rules,
        map: ctx.meta.map,
        round: ctx.scene.round,
    };

    if (!reaction.mayReact(args)) return null;

    const seed = counterSeed(ctx);

    const rng = mulberry32(seed);

    const { criticals } = ctx.meta.rules;

    const gate = createCritGate({
        rng,
        disabled: {
            success: criticals.disabledSuccess,
            fail: criticals.disabledFail,
        },
    });

    const probe = await executeCast(plan, { rng, crit: gate.pick });

    const window = reaction.open({ ...args, resolved: probe.participants });

    if (!window) return { seed };

    const dmUserId = ctx.meta.dmUserId ?? (ctx.isDM ? ctx.userId : null);

    const offers = window.offers.flatMap((o) => {
        const reactor = findParticipant(order, o.reactorId);

        return reactor
            ? [
                  {
                      reactorId: o.reactorId,
                      dm: controlledByDm(reactor, dmUserId),
                      slotLevels: [],
                      system: { label: o.label },
                  },
              ]
            : [];
    });

    if (offers.length === 0) return { seed };

    return openCounterWindow(ctx, {
        caster,
        spell: { name: spell.name, level: spell.level },
        offers,
        request: { ...data, diceRolls: plan.diceRolls },
        serverRolls: plan.serverRolls,
        now: Date.now(),
        seed,
        system: window.data,
    });
}
