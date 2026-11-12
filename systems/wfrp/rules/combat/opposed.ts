import {
    type PercentileTestResult,
    resolvePercentileTest,
} from '../percentile';
import type { DefenseKind } from './constants';

import type { Rng } from '@/lib/utils/common/rng';

export interface OpposedInput {
    attackerTarget: number;
    defenderTargets: { kind: DefenseKind; target: number }[];
    attackerSlMod?: number;
    defenderSlMod?: number;
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
    rng,
    presetRolls,
}: OpposedInput): OpposedResult {
    const best = defenderTargets.reduce<{ kind: DefenseKind; target: number }>(
        (a, b) => (b.target > a.target ? b : a),
        { kind: 'dodge', target: 0 }
    );

    const attacker = resolvePercentileTest({
        target: attackerTarget,
        slModifier: attackerSlMod,
        doubles: true,
        rng,
        presetRoll: presetRolls?.attacker,
    });

    const defender = {
        ...resolvePercentileTest({
            target: best.target,
            slModifier: defenderSlMod,
            rng,
            presetRoll: presetRolls?.defender,
        }),
        kind: best.kind,
    };

    const netSl = attacker.sl - defender.sl;

    const attackerSucceeded =
        attacker.outcome === 'success' || attacker.outcome === 'critical';

    const isHit = attackerSucceeded && netSl >= 0;

    return { attacker, defender, isHit, netSl, attackerWon: isHit };
}
