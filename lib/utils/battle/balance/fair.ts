import { armorFactors } from "./hit-chance";
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
  /** Weapon to-hit of the party, weighted by weapon DPR. */
  toHit?: number;
  ac?: number;
  /** Share of party DPR that comes from weapon attacks (rolled against AC). */
  weaponShare?: number;
}

export interface PartyMember {
  dpr: number;
  hp: number;
  toHit?: number;
  ac?: number;
  weaponDpr?: number;
}

export function unitMember(u: { dpr: number; hp: number; ac?: number; attackBonus?: number }): PartyMember {
  return { dpr: u.dpr, hp: u.hp, ac: u.ac, toHit: u.attackBonus, weaponDpr: u.attackBonus === undefined ? 0 : u.dpr };
}

export function heroMember(s: { dpr: number; hp: number; toHit: number; ac: number; weaponDpr: number }): PartyMember {
  return { dpr: s.dpr, hp: s.hp, toHit: s.toHit, ac: s.ac, weaponDpr: s.weaponDpr };
}

export function buildPartyPower(members: Array<{ stats: PartyMember; quantity?: number; hero: boolean }>): PartyPower {
  const party: PartyPower = { dpr: 0, hp: 0, heroCount: 0 };

  let hitWeight = 0;

  let hitSum = 0;

  let acCount = 0;

  let acSum = 0;

  for (const { stats, quantity = 1, hero } of members) {
    party.dpr += stats.dpr * quantity;
    party.hp += stats.hp * quantity;

    if (hero) party.heroCount += 1;

    const weaponDpr = (stats.weaponDpr ?? stats.dpr) * quantity;

    if (stats.toHit !== undefined && weaponDpr > 0) {
      hitWeight += weaponDpr;
      hitSum += stats.toHit * weaponDpr;
    }

    if (stats.ac !== undefined) {
      acCount += quantity;
      acSum += stats.ac * quantity;
    }
  }

  if (hitWeight > 0) {
    party.toHit = hitSum / hitWeight;
    party.weaponShare = party.dpr > 0 ? Math.min(1, hitWeight / party.dpr) : 1;
  }

  if (acCount > 0) party.ac = acSum / acCount;

  return party;
}

/** The unit as this party feels it: HP scaled by how hard it is to hit, DPR by how easily it hits the party. */
export function effectiveUnit(unit: UnitStats, party: PartyPower): UnitStats {
  const f = armorFactors(unit, party);

  if (f.hp === 1 && f.dpr === 1) return unit;

  const hp = unit.hp * f.hp;

  const dpr = unit.dpr * f.dpr;

  return { ...unit, hp, dpr, kpi: dpr / hp };
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
  fixed: Power;
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

export interface Entry {
  unit: UnitStats;
  quantity: number;
}

export function scaleEntries(target: Power, entries: Entry[], weakest: TierCeilings) {
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

type ScaleFn = (entries: Entry[]) => ReturnType<typeof scaleEntries>;

function suggestHint(kind: "weak" | "excess", target: Power, entries: Entry[], pool: UnitStats[], scale: ScaleFn): BalanceHint | null {
  let current = entries;

  let fit = misfit(target, scale(current).reached);

  const changes = new Map<string, BalanceHintChange>();

  for (let step = 0; step < HINT_MAX_STEPS; step++) {
    const verdict = verdictOf(target, scale(current).reached);

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

        const f = misfit(target, scale(entries).reached);

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

const ZERO: Power = { hp: 0, dpr: 0 };

/** `fixed` — сила ворогів, що не масштабуються (NPC-персонажі): входить у базу й досягнуту силу, а масштабовані юніти добирають решту цілі. */
export function computeFairScaling(party: PartyPower, roster: RosterEntry[], rawLibrary: UnitStats[], rawHintPool: UnitStats[] = rawLibrary, fixed: Power = ZERO): FairScaling {
  const target = targetEnemyPower(party);

  const felt = (list: UnitStats[]) => list.map((u) => effectiveUnit(u, party));

  const library = felt(rawLibrary);

  const hintPool = rawHintPool === rawLibrary ? library : felt(rawHintPool);

  const byId = new Map(library.map((u) => [u.unitId, u]));

  const entries = resolveEntries(roster, byId);

  if (entries.length === 0 || party.dpr <= 0 || party.hp <= 0) {
    return { verdict: "empty", target, base: { hp: 0, dpr: 0 }, reached: { hp: 0, dpr: 0 }, hpScale: 1, dmgScale: 1, units: {}, fixed, hint: null };
  }

  const weakest = weakestPerTier(library);

  const scalable: Power = { hp: Math.max(0, target.hp - fixed.hp), dpr: Math.max(0, target.dpr - fixed.dpr) };

  const scale: ScaleFn = (list) => {
    const r = scaleEntries(scalable, list, weakest);

    return { ...r, base: { hp: r.base.hp + fixed.hp, dpr: r.base.dpr + fixed.dpr }, reached: { hp: r.reached.hp + fixed.hp, dpr: r.reached.dpr + fixed.dpr } };
  };

  const { base, hpScale, dmgScale, units, reached } = scale(entries);

  const verdict = verdictOf(target, reached);

  const hint = verdict === "weak" || verdict === "excess" ? suggestHint(verdict, target, entries, hintPool, scale) : null;

  return { verdict, target, base, reached, hpScale, dmgScale, units, fixed, hint };
}
