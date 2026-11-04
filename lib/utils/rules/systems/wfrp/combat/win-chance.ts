import { resolvePercentileTest } from "../percentile";

import type { Rng } from "@/lib/utils/common/rng";

const ROLLS = 100;

const MAX_TARGET = 100;

const UNUSED_RNG: Rng = () => 0;

/** Success level per roll 1..100 for a target, null on failure. */
const successLevels = (target: number): Array<number | null> =>
  Array.from({ length: ROLLS }, (_, i) => {
    const r = resolvePercentileTest({ target, presetRoll: i + 1, rng: UNUSED_RNG });

    return r.outcome === "success" || r.outcome === "critical" ? r.sl : null;
  });

let table: number[][] | null = null;

function build(): number[][] {
  const levels = Array.from({ length: MAX_TARGET + 1 }, (_, t) => successLevels(t));

  // defenderBeaten[t][k]: share of defender rolls that fail or succeed with SL <= k
  const defenderBeaten = levels.map((rolls) => {
    const maxSl = 10;

    const counts = new Array<number>(maxSl + 1).fill(0);

    let failed = 0;

    for (const sl of rolls) {
      if (sl === null) failed += 1;
      else counts[Math.min(maxSl, sl)] += 1;
    }

    let run = failed;

    return counts.map((c) => (run += c) / ROLLS);
  });

  return levels.map((att) => defenderBeaten.map((beaten) => att.reduce<number>((sum, sl) => (sl === null ? sum : sum + beaten[Math.min(10, sl)]), 0) / ROLLS));
}

/** P(attacker wins an opposed test): attacker succeeds and its SL is at least the defender's (a failed defender counts as 0). Targets clamp to 0..100. */
export function winChance(attackerTarget: number, defenderTarget: number): number {
  table ??= build();

  const clampTarget = (n: number) => Math.min(MAX_TARGET, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));

  return table[clampTarget(attackerTarget)][clampTarget(defenderTarget)];
}
