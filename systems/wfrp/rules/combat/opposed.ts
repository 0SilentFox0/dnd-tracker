import type { EditionProfile } from '../edition';
import {
    type ForcedResult,
    type PercentileTestResult,
    resolvePercentileTest,
} from '../percentile';
import { type ModeSources, resolveModeSources } from '../percentile/advantage';
import type { DefenseKind } from './constants';

import type { Rng } from '@/lib/utils/common/rng';

export interface OpposedInput {
    attackerTarget: number;
    defenderTargets: { kind: DefenseKind; target: number }[];
    attackerSlMod?: number;
    defenderSlMod?: number;
    attackerModes?: ModeSources;
    /** Advantage sources of the defence that is chosen (a parry is a melee test, a dodge is not) */
    defenderModes?: Partial<Record<DefenseKind, ModeSources>>;
    edition?: Pick<EditionProfile, 'slModel' | 'opposedModel'>;
    /** The attacker's result is chosen (Fate): wins by at least +1 SL (p133) */
    attackerForced?: ForcedResult;
    /** The defender's successful doubles are a Critical Hit too (p165) */
    defenderDoubles?: boolean;
    /** The defender cannot defend (Surprised, p187): the defence automatically fails */
    defenderHelpless?: boolean;
    rng: Rng;
    presetRolls?: { attacker?: number; defender?: number };
}

export interface OpposedResult {
    attacker: PercentileTestResult;
    defender: PercentileTestResult & { kind: DefenseKind };
    isHit: boolean;
    netSl: number;
    attackerWon: boolean;
}

export function resolveOpposed({
    attackerTarget,
    defenderTargets,
    attackerSlMod = 0,
    defenderSlMod = 0,
    attackerModes,
    defenderModes,
    edition,
    attackerForced,
    defenderDoubles,
    defenderHelpless,
    rng,
    presetRolls,
}: OpposedInput): OpposedResult {
    const best = defenderTargets.reduce<{ kind: DefenseKind; target: number }>(
        (a, b) => (b.target > a.target ? b : a),
        { kind: 'dodge', target: 0 }
    );

    const aMode = resolveModeSources(attackerModes ?? {});

    const dMode = resolveModeSources(defenderModes?.[best.kind] ?? {});

    const attacker = resolvePercentileTest({
        target: attackerTarget,
        slModifier: attackerSlMod + aMode.slMod,
        mode: aMode.mode,
        doubles: true,
        slModel: edition?.slModel,
        rng,
        presetRoll: presetRolls?.attacker,
        forced: attackerForced,
    });

    const rolled = {
        ...resolvePercentileTest({
            target: best.target,
            slModifier: defenderSlMod + dMode.slMod,
            mode: dMode.mode,
            doubles: defenderDoubles,
            slModel: edition?.slModel,
            rng,
            presetRoll: presetRolls?.defender,
        }),
        kind: best.kind,
    };

    const defender = defenderHelpless
        ? { ...rolled, outcome: 'failure' as const, sl: 0, auto: null }
        : rolled;

    const netSl = attackerForced
        ? Math.max(1, attacker.sl - defender.sl)
        : attacker.sl - defender.sl;

    const attackerSucceeded =
        attacker.outcome === 'success' || attacker.outcome === 'critical';

    const isHit =
        edition?.opposedModel === 'higherSl'
            ? netSl >= 0
            : attackerSucceeded && netSl >= 0;

    return { attacker, defender, isHit, netSl, attackerWon: isHit };
}
