import { type PartyPower, type RosterEntry, targetEnemyPower } from "./fair";
import type { UnitStats } from "./stats";

import { PICK_CANDIDATE_UNITS, PICK_MAX_DISTINCT_UNITS, PICK_TOLERANCE, SCALE_MAX, SCALE_MIN } from "@/lib/constants/battle-balance";

export interface PickedEnemy extends RosterEntry {
  name: string;
}

export interface PickResult {
  roster: PickedEnemy[];
  hpScale: number;
  dmgScale: number;
  withinTolerance: boolean;
}

const lnDistance = (a: number, b: number) => (a > 0 && b > 0 ? Math.abs(Math.log(a / b)) : 0);

function* compositions(total: number, parts: number): Generator<number[]> {
  if (parts === 1) {
    yield [total];

    return;
  }

  for (let first = 1; first <= total - (parts - 1); first++) {
    for (const rest of compositions(total - first, parts - 1)) yield [first, ...rest];
  }
}

function* combinations<T>(items: T[], size: number, start = 0): Generator<T[]> {
  if (size === 0) {
    yield [];

    return;
  }

  for (let i = start; i <= items.length - size; i++) {
    for (const rest of combinations(items, size - 1, i + 1)) yield [items[i], ...rest];
  }
}

/**
 * Склад, для якого hpScale і dmgScale найближчі до 1 (±PICK_TOLERANCE).
 * Пріоритет: юніти тіру, близького до сили одного героя → кількість у [⌈N/2⌉, 2N] → менше різних юнітів.
 */
export function pickEnemyRoster(party: PartyPower, library: UnitStats[], raceId?: string | null): PickResult | null {
  const pool = (raceId ? library.filter((u) => u.raceId === raceId) : library).filter((u) => u.hp > 0 && u.dpr > 0);

  const heroes = Math.max(1, party.heroCount);

  if (pool.length === 0 || party.dpr <= 0 || party.hp <= 0) return null;

  const target = targetEnemyPower(party);

  const perHero = { hp: party.hp / heroes, dpr: party.dpr / heroes };

  const closeness = (u: UnitStats) => lnDistance(u.hp, perHero.hp) + lnDistance(u.dpr, perHero.dpr);

  const candidates = [...pool].sort((a, b) => closeness(a) - closeness(b)).slice(0, PICK_CANDIDATE_UNITS);

  const minTotal = Math.ceil(heroes / 2);

  const maxTotal = heroes * 2;

  const found: { best: { score: [number, number, number, number]; roster: PickedEnemy[]; hpScale: number; dmgScale: number; within: boolean } | null } = { best: null };

  const consider = (units: UnitStats[], quantities: number[]) => {
    const base = units.reduce((a, u, i) => ({ hp: a.hp + u.hp * quantities[i], dpr: a.dpr + u.dpr * quantities[i] }), { hp: 0, dpr: 0 });

    if (base.hp <= 0 || base.dpr <= 0) return;

    const hpScale = target.hp / base.hp;

    const dmgScale = target.dpr / base.dpr;

    const within = Math.abs(hpScale - 1) <= PICK_TOLERANCE && Math.abs(dmgScale - 1) <= PICK_TOLERANCE;

    const inRange = hpScale >= SCALE_MIN && hpScale <= SCALE_MAX && dmgScale >= SCALE_MIN && dmgScale <= SCALE_MAX;

    const total = quantities.reduce((a, b) => a + b, 0);

    const weighted = units.reduce((a, u, i) => a + closeness(u) * quantities[i], 0) / total;

    const deviation = lnDistance(hpScale, 1) + lnDistance(dmgScale, 1);

    const score: [number, number, number, number] = [within ? 0 : inRange ? 1 : 2, within ? Math.round(weighted * 4) : 0, units.length, within ? deviation : deviation + weighted / 100];

    if (found.best && compareScore(score, found.best.score) >= 0) return;

    found.best = { score, roster: units.map((u, i) => ({ unitId: u.unitId, name: u.name, quantity: quantities[i] })), hpScale, dmgScale, within };
  };

  for (let total = minTotal; total <= maxTotal; total++) {
    for (let distinct = 1; distinct <= Math.min(PICK_MAX_DISTINCT_UNITS, total); distinct++) {
      for (const units of combinations(candidates, distinct)) {
        for (const quantities of compositions(total, distinct)) consider(units, quantities);
      }
    }
  }

  if (!found.best) return null;

  const { roster, hpScale, dmgScale, within } = found.best;

  return { roster, hpScale, dmgScale, withinTolerance: within };
}

function compareScore(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];

  return 0;
}
