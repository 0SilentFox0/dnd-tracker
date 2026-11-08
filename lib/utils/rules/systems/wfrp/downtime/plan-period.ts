import { bonus, skillTarget } from "../characteristics/derive";
import type { Characteristics } from "../characteristics/keys";
import { tickAilments } from "./ailments";
import { REST_HEAL_MULTIPLIER } from "./constants";
import type { EndeavourOutcome } from "./endeavours";
import { resolveEndeavour, validateEndeavour } from "./endeavours";
import { rollEvent } from "./event";
import { healWounds } from "./heal";
import type { Ailment, CoinAmount, DowntimeState, PeriodSnapshot, PeriodSummary } from "./types";

import { currentHp, withHp } from "@/lib/utils/characters/resources/hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { CharacterResources } from "@/types/characters";

export type PeriodHero = { id: string; resources: CharacterResources; characteristics: Characteristics; maxHp: number; status?: string | null };

export type PeriodPresets = { endeavour?: number; ailments?: number[]; event?: number };

export type PeriodInput = { heroes: PeriodHero[]; days: number; rules: Pick<Ruleset, "tables">; rng: Rng; periodId: string; now: string; presets?: Record<string, PeriodPresets> };

export type PlannedHero = { id: string; resources: CharacterResources; characteristics: Characteristics; coins?: CoinAmount; summary: PeriodSummary };

type Outcome = { summary?: PeriodSummary["endeavour"]; result: EndeavourOutcome };

function runEndeavour(h: PeriodHero, input: PeriodInput, patientPresent: (id: string) => boolean): Outcome | undefined {
  const e = h.characteristics.downtime?.endeavour;

  if (!e) return undefined;

  if (e.kind === "tend" && !patientPresent(e.params.patientId)) return { summary: { kind: "tend", patientId: e.params.patientId, skipped: "patientAbsent" }, result: {} };

  if (validateEndeavour(e, h.characteristics)) return { summary: { kind: e.kind }, result: {} };

  const result = resolveEndeavour(e, { characteristics: h.characteristics, status: h.status, rng: input.rng, presetRoll: input.presets?.[h.id]?.endeavour });

  return {
    summary: {
      kind: e.kind,
      ...(result.test ? { test: result.test } : {}),
      ...(result.coins ? { coins: result.coins } : {}),
      ...(result.training ? { discount: result.training.discount } : {}),
      ...(e.kind === "tend" ? { patientId: e.params.patientId } : {}),
    },
    result,
  };
}

function reduceNearest(ailments: Ailment[], days: number): Ailment[] {
  if (days <= 0 || ailments.length === 0) return ailments;

  const nearest = ailments.reduce((best, a) => (a.daysLeft < best.daysLeft ? a : best));

  return ailments.map((a) => (a === nearest ? { ...a, daysLeft: a.daysLeft - days } : a));
}

export function planPeriod(input: PeriodInput): PlannedHero[] {
  const { heroes, days } = input;

  const byId = new Map(heroes.map((h) => [h.id, h]));

  const patientPresent = (id: string) => {
    const p = byId.get(id);

    return !!p && !p.resources.dead;
  };

  const outcomes = new Map<string, Outcome>();

  const tendBonus = new Map<string, { heal: number; days: number }>();

  for (const h of heroes) {
    if (h.resources.dead || currentHp(h.resources, h.maxHp) === 0) continue;

    const o = runEndeavour(h, input, patientPresent);

    if (!o) continue;

    outcomes.set(h.id, o);

    const tend = o.result.tend;

    if (tend) {
      const prev = tendBonus.get(tend.patientId) ?? { heal: 0, days: 0 };

      tendBonus.set(tend.patientId, { heal: prev.heal + tend.heal, days: prev.days + tend.days });
    }
  }

  return heroes.map((h) => {
    const prev: DowntimeState = h.characteristics.downtime ?? { ailments: [] };

    const before = { ...(h.resources.hp !== undefined ? { hp: h.resources.hp } : {}), ailments: prev.ailments, ...(prev.training ? { training: prev.training } : {}) };

    const finish = (resources: CharacterResources, ailments: Ailment[], summary: PeriodSummary): PlannedHero => {
      const training = outcomes.get(h.id)?.result.training ?? prev.training;

      const coins = summary.endeavour?.coins;

      const snapshot: PeriodSnapshot = {
        id: input.periodId,
        at: input.now,
        days,
        before,
        after: { ...(resources.hp !== undefined ? { hp: resources.hp } : {}), ailmentIds: ailments.map((a) => a.id), ...(training ? { training } : {}) },
        ...(coins ? { coins } : {}),
        summary,
      };

      const downtime: DowntimeState = { ...prev, ailments, ...(training ? { training } : {}), lastPeriod: snapshot };

      return { id: h.id, resources, characteristics: { ...h.characteristics, downtime }, ...(coins ? { coins } : {}), summary };
    };

    if (h.resources.dead) return finish(h.resources, prev.ailments, { skipped: "dead", healed: 0, ailments: [] });

    const presets = input.presets?.[h.id];

    const incapacitated = currentHp(h.resources, h.maxHp) === 0;

    const outcome = outcomes.get(h.id);

    const tend = tendBonus.get(h.id);

    const current = currentHp(h.resources, h.maxHp);

    const rest = h.characteristics.downtime?.endeavour?.kind === "rest" && !incapacitated;

    const healed = healWounds({ current, max: h.maxHp, tb: bonus(h.characteristics, "t"), days, multiplier: rest ? REST_HEAL_MULTIPLIER : 1, bonus: tend?.heal ?? 0 });

    const endurance = skillTarget(h.characteristics, "endurance")?.target ?? 0;

    const ticked = tickAilments(reduceNearest(prev.ailments, tend?.days ?? 0), days, { endurance, rng: input.rng, presetRolls: presets?.ailments });

    const event = rollEvent(input.rules, input.rng, presets?.event);

    const hp = Math.max(0, healed - ticked.wounds - (event.wounds ?? 0));

    const summary: PeriodSummary = {
      ...(incapacitated ? { skipped: "incapacitated" as const } : {}),
      healed: healed - current,
      ...(outcome?.summary ? { endeavour: outcome.summary } : {}),
      ailments: ticked.report,
      event,
    };

    return finish(withHp(h.resources, hp, h.maxHp), ticked.ailments, summary);
  });
}
