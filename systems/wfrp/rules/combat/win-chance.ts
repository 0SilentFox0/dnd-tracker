import type { EditionProfile } from '../edition';
import { resolvePercentileTest } from '../percentile';

import type { Rng } from '@/lib/utils/common/rng';

type Model = Pick<EditionProfile, 'slModel' | 'opposedModel'>;

type Side = 'advantage' | 'normal';

export interface WinChanceModes {
    attacker?: Side;
}

const ROLLS = 100;

const MAX_TARGET = 100;

const MAX_SL = 10;

const UNUSED_RNG: Rng = () => 0;

const LEGACY: Model = {
    slModel: 'clamped',
    opposedModel: 'attackerMustSucceed',
};

/** Signed success level per roll 1..100 for a target; null on failure when `failureIsNull`. */
const levels = (
    target: number,
    slModel: Model['slModel'],
    failureIsNull: boolean,
    mode: Side = 'normal'
): Array<number | null> =>
    Array.from({ length: ROLLS }, (_, i) => {
        const r = resolvePercentileTest({
            target,
            presetRoll: i + 1,
            slModel,
            mode,
            rng: UNUSED_RNG,
        });

        const passed = r.outcome === 'success' || r.outcome === 'critical';

        return !passed && failureIsNull ? null : r.sl;
    });

const clampSl = (sl: number) => Math.min(MAX_SL, Math.max(-MAX_SL, sl));

function build(model: Model, attackerMode: Side): number[][] {
    const legacy = model.opposedModel === 'attackerMustSucceed';

    const all = Array.from({ length: MAX_TARGET + 1 }, (_, t) =>
        levels(t, model.slModel, legacy)
    );

    const attackers =
        attackerMode === 'normal'
            ? all
            : Array.from({ length: MAX_TARGET + 1 }, (_, t) =>
                  levels(t, model.slModel, legacy, attackerMode)
              );

    // beaten[t][k + MAX_SL]: share of defender rolls whose SL is at most k (a legacy failure counts as 0)
    const beaten = all.map((rolls) => {
        const counts = new Array<number>(2 * MAX_SL + 1).fill(0);

        for (const sl of rolls) counts[clampSl(sl ?? 0) + MAX_SL] += 1;

        let run = 0;

        return counts.map((c) => (run += c) / ROLLS);
    });

    return attackers.map((att) =>
        beaten.map(
            (cdf) =>
                att.reduce<number>(
                    (sum, sl) =>
                        sl === null ? sum : sum + cdf[clampSl(sl) + MAX_SL],
                    0
                ) / ROLLS
        )
    );
}

const tables = new Map<string, number[][]>();

const tableOf = (model: Model, attackerMode: Side) => {
    const key = `${model.slModel}:${model.opposedModel}:${attackerMode}`;

    let table = tables.get(key);

    if (!table) {
        table = build(model, attackerMode);

        tables.set(key, table);
    }

    return table;
};

/** P(attacker wins an opposed test). Legacy: the attacker must succeed with SL at least the defender's (a failed defender counts as 0). Canon: the higher SL wins, ties go to the attacker. Targets clamp to 0..100. */
export function winChanceFor(model: Model, modes: WinChanceModes = {}) {
    const table = tableOf(model, modes.attacker ?? 'normal');

    return (attackerTarget: number, defenderTarget: number): number => {
        const clampTarget = (n: number) =>
            Math.min(
                MAX_TARGET,
                Math.max(0, Math.round(Number.isFinite(n) ? n : 0))
            );

        return table[clampTarget(attackerTarget)][clampTarget(defenderTarget)];
    };
}

/** Stationary Momentum: the winner of an exchange holds it, which gives the next test Advantage until it is lost. */
export function momentumWinChance(model: Model) {
    const normal = winChanceFor(model);

    const advantage = winChanceFor(model, { attacker: 'advantage' });

    return (attackerTarget: number, defenderTarget: number): number => {
        const wN = normal(attackerTarget, defenderTarget);

        const wA = advantage(attackerTarget, defenderTarget);

        const denom = 1 - wA + wN;

        const held = denom > 0 ? wN / denom : 0;

        return held * wA + (1 - held) * wN;
    };
}

export const winChance = winChanceFor(LEGACY);
