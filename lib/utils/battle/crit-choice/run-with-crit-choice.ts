import { createCritGate } from './gate';
import type { CritPicker, CritResume } from './types';

import { consumeRider } from '@/lib/utils/battle/d20-rider/held';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import type { Rng } from '@/lib/utils/common/rng';
import { mulberry32 } from '@/lib/utils/common/rng';

interface RunWithCritChoiceOptions {
    action: 'attack' | 'spell';
    actorId: string;
    request: unknown;
    enabled: boolean;
    serverRolls?: boolean;
    resume?: CritResume;
    /** replays a stored request with its original seed (no crit resume) */
    seed?: number;
    run(env: {
        rng: Rng;
        crit: CritPicker;
    }): MutationResult | Promise<MutationResult>;
}

export async function runWithCritChoice(
    ctx: BattleMutationContext,
    opts: RunWithCritChoiceOptions
): Promise<MutationResult> {
    const seed =
        opts.resume?.seed ?? opts.seed ?? Math.floor(Math.random() * 2 ** 32);

    const rng =
        !opts.resume && opts.seed === undefined && ctx.rng
            ? ctx.rng
            : mulberry32(seed);

    const { criticals } = ctx.meta.rules;

    const gate = createCritGate({
        rng,
        choices: opts.resume?.choices,
        riderChoices: opts.resume?.riderChoices,
        disabled: {
            success: criticals.disabledSuccess,
            fail: criticals.disabledFail,
        },
    });

    const ran = await opts.run({ rng, crit: gate.pick });

    const result = gate.spent.length
        ? {
              ...ran,
              participants: gate.spent.reduce(
                  (ps, s) => consumeRider(ps, s.holderId, s.effectId),
                  ran.participants
              ),
          }
        : ran;

    if (opts.resume)
        return { ...result, scene: { ...result.scene, pendingChoice: null } };

    const critPause = opts.enabled && gate.triggers.length > 0;

    if (!critPause && gate.offers.length === 0) return result;

    return {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
        scene: {
            pendingChoice: {
                shown: {
                    action: opts.action,
                    actorId: opts.actorId,
                    triggers: critPause ? gate.triggers : [],
                    ...(gate.offers.length > 0 && { riders: gate.offers }),
                },
                hidden: {
                    request: opts.request,
                    seed,
                    ...(opts.serverRolls && { serverRolls: true }),
                    userId: ctx.userId,
                    isDM: ctx.isDM,
                },
            },
        },
        response: { pendingChoice: true },
    };
}
