import { skillTarget } from "../characteristics/derive";
import type { Characteristics } from "../characteristics/keys";
import { DIFFICULTY_SL } from "../percentile/difficulty";
import { resolvePercentileTest } from "../percentile/resolve";
import { ENDEAVOUR_DIFFICULTY, STATUS_COIN, TEND_DAYS_PER_SL, TEND_HEAL_PER_SL, TRAIN_DISCOUNT_BASE, TRAIN_DISCOUNT_PER_SL } from "./constants";
import { parseStatus } from "./status";
import type { CoinAmount, Endeavour, TestOutcome, TrainingCredit } from "./types";

import type { Rng } from "@/lib/utils/common/rng";

export type EndeavourCtx = { characteristics: Characteristics; status?: string | null; rng: Rng; presetRoll?: number };

export type EndeavourOutcome = { test?: TestOutcome; coins?: CoinAmount; training?: TrainingCredit; tend?: { patientId: string; heal: number; days: number } };

const skillOf = (e: Endeavour): { key: string; spec?: string } | null => {
  switch (e.kind) {
    case "earn":
      return e.params.skill === "trade" ? { key: "trade", spec: e.params.spec } : { key: "charm" };
    case "train":
      return { key: "research" };
    case "tend":
      return { key: "heal" };
    default:
      return null;
  }
};

export function validateEndeavour(e: Endeavour, c: Characteristics): "SKILL_UNTRAINED" | null {
  const skill = skillOf(e);

  if (!skill) return null;

  const t = skillTarget(c, skill.key, skill.spec);

  return !t || !t.trained ? "SKILL_UNTRAINED" : null;
}

export function resolveEndeavour(e: Endeavour, ctx: EndeavourCtx): EndeavourOutcome {
  const skill = skillOf(e);

  const t = skill && skillTarget(ctx.characteristics, skill.key, skill.spec);

  if (!skill || !t) return {};

  const r = resolvePercentileTest({ target: t.target, slModifier: DIFFICULTY_SL[ENDEAVOUR_DIFFICULTY], doubles: false, mode: "normal", rng: ctx.rng, presetRoll: ctx.presetRoll });

  const test: TestOutcome = { roll: r.roll, target: r.target, sl: r.sl, outcome: r.outcome };

  if (r.outcome !== "success" && r.outcome !== "critical") return { test };

  const sl = Math.max(1, r.sl);

  switch (e.kind) {
    case "earn": {
      const status = parseStatus(ctx.status);

      return { test, coins: { coin: STATUS_COIN[status.tier], amount: sl * status.level } };
    }
    case "train":
      return { test, training: { kind: e.params.kind, key: e.params.key, discount: TRAIN_DISCOUNT_BASE + r.sl * TRAIN_DISCOUNT_PER_SL } };
    case "tend":
      return { test, tend: { patientId: e.params.patientId, heal: sl * TEND_HEAL_PER_SL, days: sl * TEND_DAYS_PER_SL } };
    default:
      return { test };
  }
}
