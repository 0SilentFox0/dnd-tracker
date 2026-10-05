import type { AbilityUsageCounter, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const EMPTY: AbilityUsageCounter = { battle: 0, round: 0, turn: 0 };

export function usageOf(p: BattleParticipant, key: string): AbilityUsageCounter {
  return p.battleData.abilityUsage?.[key] ?? EMPTY;
}

export function withinLimits(p: BattleParticipant, ability: ResolvedAbility): boolean {
  const l = ability.limits;

  if (!l) return true;

  const u = usageOf(p, ability.key);

  return !(
    (l.perBattle !== undefined && u.battle >= l.perBattle) ||
    (l.perRound !== undefined && u.round >= l.perRound) ||
    (l.perTurn !== undefined && u.turn >= l.perTurn)
  );
}

export function recordUse(p: BattleParticipant, key: string): BattleParticipant {
  const u = usageOf(p, key);

  return {
    ...p,
    battleData: {
      ...p.battleData,
      abilityUsage: { ...p.battleData.abilityUsage, [key]: { battle: u.battle + 1, round: u.round + 1, turn: u.turn + 1 } },
    },
  };
}

export function resetUsage(p: BattleParticipant, scope: "round" | "turn"): BattleParticipant {
  const usage = p.battleData.abilityUsage;

  if (!usage) return p;

  const next = Object.fromEntries(Object.entries(usage).map(([k, u]) => [k, { ...u, [scope]: 0 }]));

  return { ...p, battleData: { ...p.battleData, abilityUsage: next } };
}
