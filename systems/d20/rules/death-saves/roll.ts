import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { clearDeathSaves, FRESH_DEATH_SAVES, isDying } from "@/lib/utils/battle/death-saves";
import { rollDie } from "@/lib/utils/common/dice";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const FAILURES_TO_DIE = 3;

const SUCCESSES_TO_STABILIZE = 3;

const needsDeathSave = (p: BattleParticipant): boolean => isDying(p) && !p.battleData.deathSaves?.stable;

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

export function rollDeathSave(p: BattleParticipant, rng: () => number): { participant: BattleParticipant; message: LogLine } {
  const saves = p.battleData.deathSaves;

  if (!saves || saves.stable) return { participant: p, message: "" };

  const name = p.basicInfo.name;

  const roll = rollDie(20, rng);

  if (roll === 20) {
    const woke = clearDeathSaves(p);

    return {
      participant: { ...woke, combatStats: { ...woke.combatStats, currentHp: 1, status: CombatStatus.ACTIVE } },
      message: textRef("battleLog.death.wake", { name }),
    };
  }

  if (roll >= 10) {
    const successes = saves.successes + 1;

    const stable = successes >= SUCCESSES_TO_STABILIZE;

    return {
      participant: { ...p, battleData: { ...p.battleData, deathSaves: stable ? { ...FRESH_DEATH_SAVES, stable: true } : { ...saves, successes } } },
      message: stable ? textRef("battleLog.death.stable", { name, roll }) : textRef("battleLog.death.success", { name, roll, count: successes, max: SUCCESSES_TO_STABILIZE }),
    };
  }

  const failed = withFailures(p, roll === 1 ? 2 : 1);

  const dead = failed.combatStats.status === CombatStatus.DEAD;

  return {
    participant: failed,
    message: dead ? textRef("battleLog.death.dies", { name, roll }) : textRef("battleLog.death.fail", { name, roll, count: failed.battleData.deathSaves?.failures ?? 0, max: FAILURES_TO_DIE }),
  };
}

export function rollDyingAt(order: BattleParticipant[], index: number, rules: Ruleset, rng: () => number): { participants: BattleParticipant[]; messages: LogLine[] } | null {
  const p = order[index];

  if (!rules.deathSaves.enabled || !p || !needsDeathSave(p)) return null;

  const rolled = rollDeathSave(p, rng);

  return { participants: order.map((x, i) => (i === index ? rolled.participant : x)), messages: [rolled.message] };
}
