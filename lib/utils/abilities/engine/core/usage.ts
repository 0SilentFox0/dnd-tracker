import type { Limits } from "@/lib/utils/abilities/schema";
import type { AbilityUsageCounter, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const EMPTY: AbilityUsageCounter = { battle: 0, round: 0, turn: 0 };

function usageOf(p: BattleParticipant, key: string): AbilityUsageCounter {
  return p.battleData.abilityUsage?.[key] ?? EMPTY;
}

export function cooldownLeft(p: BattleParticipant, ability: ResolvedAbility, round: number): number {
  const cooldown = ability.limits?.cooldownRounds;

  const { lastRound } = usageOf(p, ability.key);

  if (!cooldown || lastRound === undefined) return 0;

  return Math.max(0, lastRound + cooldown + 1 - round);
}

// нерозв'язане посилання на таблицю класу чи формула → 0, вміння недоступне
export function restUses(l: Limits): number | undefined {
  const uses = l.perRest?.uses;

  if (uses === undefined) return undefined;

  return typeof uses === "number" ? uses : 0;
}

export const battleLimit = (l: Limits): number | undefined => l.perBattle ?? restUses(l);

export function poolLeft(p: BattleParticipant, key: string): number | null {
  const pool = p.battleData.pools?.[key];

  return pool ? Math.max(0, pool.max - usageOf(p, key).battle) : null;
}

export function poolAffordable(p: BattleParticipant, ability: ResolvedAbility): boolean {
  const pool = ability.limits?.pool;

  if (!pool) return true;

  const left = poolLeft(p, pool.key);

  return left !== null && left >= pool.cost;
}

export function withinCountLimits(p: BattleParticipant, ability: ResolvedAbility): boolean {
  const l = ability.limits;

  if (!l) return true;

  if (!poolAffordable(p, ability)) return false;

  const u = usageOf(p, ability.key);

  return !(
    (battleLimit(l) !== undefined && u.battle >= (battleLimit(l) as number)) ||
    (l.perRound !== undefined && u.round >= l.perRound) ||
    (l.perTurn !== undefined && u.turn >= l.perTurn)
  );
}

export function withinLimits(p: BattleParticipant, ability: ResolvedAbility, round: number): boolean {
  return withinCountLimits(p, ability) && cooldownLeft(p, ability, round) === 0;
}

export function recordUse(p: BattleParticipant, key: string, round: number, pool?: { key: string; cost: number }): BattleParticipant {
  const u = usageOf(p, key);

  const bump = (c: typeof u, n: number) => ({ battle: c.battle + n, round: c.round + n, turn: c.turn + n, lastRound: round });

  const usage = { ...p.battleData.abilityUsage, [key]: bump(u, 1) };

  if (pool) usage[pool.key] = bump(usageOf(p, pool.key), pool.cost);

  return { ...p, battleData: { ...p.battleData, abilityUsage: usage } };
}

export function resetUsage(p: BattleParticipant, scope: "round" | "turn"): BattleParticipant {
  const usage = p.battleData.abilityUsage;

  if (!usage) return p;

  const next = Object.fromEntries(Object.entries(usage).map(([k, u]) => [k, { ...u, [scope]: 0 }]));

  return { ...p, battleData: { ...p.battleData, abilityUsage: next } };
}
