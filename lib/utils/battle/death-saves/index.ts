import { CombatStatus } from "@/lib/constants/battle";
import { isDying } from "@/lib/utils/abilities/engine/core/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { conditionEffectInput, PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions/registry";
import { rollDie } from "@/lib/utils/common/dice";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export const DEATH_SAVES_TIMED_KEY = "death-saves:unconscious";

const FRESH_DEATH_SAVES = { successes: 0, failures: 0, stable: false };

const FAILURES_TO_DIE = 3;

const SUCCESSES_TO_STABILIZE = 3;

export { isDying };

export const needsDeathSave = (p: BattleParticipant): boolean => isDying(p) && !p.battleData.deathSaves?.stable;

export function clearDeathSaves(p: BattleParticipant): BattleParticipant {
  if (!p.battleData.deathSaves) return p;

  const { deathSaves: _removed, ...battleData } = p.battleData;

  return { ...p, battleData: { ...battleData, activeEffects: battleData.activeEffects.filter((e) => e.abilityKey !== DEATH_SAVES_TIMED_KEY) } };
}

export function startDying(p: BattleParticipant, rules: Ruleset): BattleParticipant {
  const down = upsertTimedEffect(p, conditionEffectInput("unconscious", { timedKey: DEATH_SAVES_TIMED_KEY, rounds: PERMANENT_ROUNDS, permanent: true, exhaustion: rules.conditions.exhaustion }), 0);

  return {
    ...down,
    combatStats: { ...down.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS },
    battleData: { ...down.battleData, deathSaves: { ...FRESH_DEATH_SAVES } },
  };
}

function withFailures(p: BattleParticipant, add: number): BattleParticipant {
  const current = p.battleData.deathSaves ?? FRESH_DEATH_SAVES;

  const saves = current.stable ? FRESH_DEATH_SAVES : current;

  const failures = Math.min(FAILURES_TO_DIE, saves.failures + add);

  return {
    ...p,
    combatStats: failures >= FAILURES_TO_DIE ? { ...p.combatStats, status: CombatStatus.DEAD } : p.combatStats,
    battleData: { ...p.battleData, deathSaves: { ...saves, failures, stable: false } },
  };
}

export function deathSaveDamage(p: BattleParticipant, crit: boolean): BattleParticipant {
  return withFailures(p, crit ? 2 : 1);
}

export function rollDeathSave(p: BattleParticipant, rng: () => number): { participant: BattleParticipant; message: string } {
  const saves = p.battleData.deathSaves;

  if (!saves || saves.stable) return { participant: p, message: "" };

  const name = p.basicInfo.name;

  const roll = rollDie(20, rng);

  if (roll === 20) {
    const woke = clearDeathSaves(p);

    return {
      participant: { ...woke, combatStats: { ...woke.combatStats, currentHp: 1, status: CombatStatus.ACTIVE } },
      message: `🎲 ${name}: кидок смерті 20 — приходить до тями з 1 HP`,
    };
  }

  if (roll >= 10) {
    const successes = saves.successes + 1;

    const stable = successes >= SUCCESSES_TO_STABILIZE;

    return {
      participant: { ...p, battleData: { ...p.battleData, deathSaves: stable ? { ...FRESH_DEATH_SAVES, stable: true } : { ...saves, successes } } },
      message: stable ? `🎲 ${name}: кидок смерті ${roll} — успіх, стабілізується` : `🎲 ${name}: кидок смерті ${roll} — успіх (${successes}/${SUCCESSES_TO_STABILIZE})`,
    };
  }

  const failed = withFailures(p, roll === 1 ? 2 : 1);

  const dead = failed.combatStats.status === CombatStatus.DEAD;

  return {
    participant: failed,
    message: dead ? `💀 ${name}: кидок смерті ${roll} — помирає` : `🎲 ${name}: кидок смерті ${roll} — провал (${failed.battleData.deathSaves?.failures}/${FAILURES_TO_DIE})`,
  };
}

export function rollDyingAt(order: BattleParticipant[], index: number, rules: Ruleset | undefined, rng: () => number): { participants: BattleParticipant[]; messages: string[] } | null {
  const p = order[index];

  if (!rules?.deathSaves.enabled || !p || !needsDeathSave(p)) return null;

  const rolled = rollDeathSave(p, rng);

  return { participants: order.map((x, i) => (i === index ? rolled.participant : x)), messages: [rolled.message] };
}
