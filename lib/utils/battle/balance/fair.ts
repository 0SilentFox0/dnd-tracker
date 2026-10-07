import type { UnitStats } from "./stats";

import {
  BALANCE_TOLERANCE,
  HERO_EDGE,
  HINT_MAX_STEPS,
  HIT_RATE,
  MAX_UNIT_QUANTITY,
  SCALE_MAX,
  SCALE_MIN,
  TARGET_ROUNDS,
} from "@/lib/constants/battle-balance";

export interface PartyPower {
  dpr: number;
  hp: number;
  heroCount: number;
}

export interface RosterEntry {
  unitId: string;
  quantity: number;
}

export interface UnitScale {
  hpMult: number;
  dmgMult: number;
}

export interface BalanceHintChange {
  unitId: string;
  name: string;
  delta: number;
}

export interface BalanceHint {
  kind: "weak" | "excess";
  changes: BalanceHintChange[];
}

export type BalanceVerdict = "even" | "weak" | "excess" | "empty";

export interface Power {
  hp: number;
  dpr: number;
}

export interface FairScaling {
  verdict: BalanceVerdict;
  target: Power;
  base: Power;
  reached: Power;
  hpScale: number;
  dmgScale: number;
  units: Record<string, UnitScale>;
  hint: BalanceHint | null;
}

export type TierCeilings = Map<number, Power>;

const clampScale = (x: number) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, x));

export function targetEnemyPower(party: PartyPower): Power {
  return { hp: party.dpr * HIT_RATE * TARGET_ROUNDS, dpr: (HERO_EDGE * party.hp) / TARGET_ROUNDS };
}

/** Найслабший юніт (за HP і за DPR окремо) кожного тіру бібліотеки. */
export function weakestPerTier(library: UnitStats[]): TierCeilings {
  const byTier: TierCeilings = new Map();

  for (const u of library) {
    if (u.hp <= 0 || u.dpr <= 0) continue;

    const cur = byTier.get(u.level);

    byTier.set(u.level, cur ? { hp: Math.min(cur.hp, u.hp), dpr: Math.min(cur.dpr, u.dpr) } : { hp: u.hp, dpr: u.dpr });
  }

  return byTier;
}

/** Стеля для тіру `tier`: найслабший юніт найближчого вищого тіру, якщо він є. */
function ceilingFor(tier: number, weakest: TierCeilings): Power | null {
  let next: number | null = null;

  for (const t of weakest.keys()) if (t > tier && (next === null || t < next)) next = t;

  return next === null ? null : (weakest.get(next) ?? null);
}

function cappedScale(scale: number, unitValue: number, ceilValue: number | undefined): number {
  if (scale <= 1 || ceilValue === undefined || unitValue <= 0) return scale;

  return Math.min(scale, Math.max(1, ceilValue / unitValue));
}

interface Entry {
  unit: UnitStats;
  quantity: number;
}

function scaleEntries(target: Power, entries: Entry[], weakest: TierCeilings) {
  const base = entries.reduce<Power>((a, e) => ({ hp: a.hp + e.unit.hp * e.quantity, dpr: a.dpr + e.unit.dpr * e.quantity }), { hp: 0, dpr: 0 });

  const hpScale = base.hp > 0 ? clampScale(target.hp / base.hp) : 1;

  const dmgScale = base.dpr > 0 ? clampScale(target.dpr / base.dpr) : 1;

  const units: Record<string, UnitScale> = {};

  const reached: Power = { hp: 0, dpr: 0 };

  for (const { unit, quantity } of entries) {
    const ceil = ceilingFor(unit.level, weakest) ?? undefined;

    const hpMult = cappedScale(hpScale, unit.hp, ceil?.hp);

    const dmgMult = cappedScale(dmgScale, unit.dpr, ceil?.dpr);

    units[unit.unitId] = { hpMult, dmgMult };
    reached.hp += unit.hp * hpMult * quantity;
    reached.dpr += unit.dpr * dmgMult * quantity;
  }

  return { base, hpScale, dmgScale, units, reached };
}

function verdictOf(target: Power, reached: Power): BalanceVerdict {
  const rh = target.hp > 0 ? reached.hp / target.hp : 1;

  const rd = target.dpr > 0 ? reached.dpr / target.dpr : 1;

  if (rh < 1 - BALANCE_TOLERANCE || rd < 1 - BALANCE_TOLERANCE) return "weak";

  if (rh > 1 + BALANCE_TOLERANCE || rd > 1 + BALANCE_TOLERANCE) return "excess";

  return "even";
}

function misfit(target: Power, reached: Power): number {
  const l = (a: number, b: number) => (a > 0 && b > 0 ? Math.abs(Math.log(a / b)) : 0);

  return l(reached.hp, target.hp) + l(reached.dpr, target.dpr);
}

function resolveEntries(roster: RosterEntry[], byId: Map<string, UnitStats>): Entry[] {
  const merged = new Map<string, number>();

  for (const r of roster) if (r.quantity > 0) merged.set(r.unitId, (merged.get(r.unitId) ?? 0) + r.quantity);

  const out: Entry[] = [];

  for (const [id, quantity] of merged) {
    const unit = byId.get(id);

    if (unit) out.push({ unit, quantity });
  }

  return out;
}

function withDelta(entries: Entry[], unit: UnitStats, delta: number): Entry[] {
  const next = entries.map((e) => (e.unit.unitId === unit.unitId ? { ...e, quantity: e.quantity + delta } : e)).filter((e) => e.quantity > 0);

  if (!entries.some((e) => e.unit.unitId === unit.unitId) && delta > 0) next.push({ unit, quantity: delta });

  return next;
}

function suggestHint(kind: "weak" | "excess", target: Power, entries: Entry[], pool: UnitStats[], weakest: TierCeilings): BalanceHint | null {
  let current = entries;

  let fit = misfit(target, scaleEntries(target, current, weakest).reached);

  const changes = new Map<string, BalanceHintChange>();

  for (let step = 0; step < HINT_MAX_STEPS; step++) {
    const verdict = verdictOf(target, scaleEntries(target, current, weakest).reached);

    if (verdict !== kind) break;

    const delta = kind === "weak" ? 1 : -1;

    const own = current.map((e) => e.unit).filter((u) => (kind === "excess" ? true : (current.find((e) => e.unit.unitId === u.unitId)?.quantity ?? 0) < MAX_UNIT_QUANTITY));

    const tiers = new Set(current.map((e) => e.unit.level));

    const neighbours = kind === "weak" ? pool.filter((u) => !current.some((e) => e.unit.unitId === u.unitId) && [...tiers].some((t) => Math.abs(t - u.level) <= 1)) : [];

    let best: { unit: UnitStats; entries: Entry[]; fit: number } | null = null;

    for (const group of [own, neighbours]) {
      for (const unit of group) {
        if (kind === "excess" && current.length === 1 && current[0].quantity <= 1) continue;

        const entries = withDelta(current, unit, delta);

        const f = misfit(target, scaleEntries(target, entries, weakest).reached);

        if (f < fit - 1e-9 && (!best || f < best.fit)) best = { unit, entries, fit: f };
      }

      if (best) break;
    }

    if (!best) break;

    current = best.entries;
    fit = best.fit;

    const prev = changes.get(best.unit.unitId);

    changes.set(best.unit.unitId, { unitId: best.unit.unitId, name: best.unit.name, delta: (prev?.delta ?? 0) + delta });
  }

  const list = [...changes.values()].filter((c) => c.delta !== 0);

  return list.length > 0 ? { kind, changes: list } : null;
}

export function computeFairScaling(party: PartyPower, roster: RosterEntry[], library: UnitStats[], hintPool: UnitStats[] = library): FairScaling {
  const target = targetEnemyPower(party);

  const byId = new Map(library.map((u) => [u.unitId, u]));

  const entries = resolveEntries(roster, byId);

  if (entries.length === 0 || party.dpr <= 0 || party.hp <= 0) {
    return { verdict: "empty", target, base: { hp: 0, dpr: 0 }, reached: { hp: 0, dpr: 0 }, hpScale: 1, dmgScale: 1, units: {}, hint: null };
  }

  const weakest = weakestPerTier(library);

  const { base, hpScale, dmgScale, units, reached } = scaleEntries(target, entries, weakest);

  const verdict = verdictOf(target, reached);

  const hint = verdict === "weak" || verdict === "excess" ? suggestHint(verdict, target, entries, hintPool, weakest) : null;

  return { verdict, target, base, reached, hpScale, dmgScale, units, hint };
}
