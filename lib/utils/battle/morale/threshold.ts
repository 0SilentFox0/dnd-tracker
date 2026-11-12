import { effectiveMorale, moraleChanceBonus } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface MoraleCheckResult {
  shouldSkipTurn: boolean;
  hasExtraTurn: boolean;
  message: LogLine;
  /** true = перевірка на додатковий хід (+мораль), false = перевірка на пропуск (-мораль) */
  moralePositive: boolean;
}

export interface PendingMoraleCheckPayload {
  participantId: string;
  d10Roll: number;
  moraleResult: MoraleCheckResult;
}

/** Межа d10: позитивна мораль +N — додатковий хід на ≥ 11−N, кожні повні 10 % лідерства знижують її на грань; негативна −N — пропуск на ≤ N. */
export function moraleThreshold(value: number, bonusPercent = 0): { kind: "extra" | "skip"; threshold: number } {
  const n = Math.min(10, Math.abs(value));

  return value > 0 ? { kind: "extra", threshold: Math.max(1, 11 - n - Math.floor(bonusPercent / 10)) } : { kind: "skip", threshold: n };
}

/** Значення d10, на яких спрацює мораль: додатковий хід (позитивна) чи пропуск ходу (негативна). */
export function moraleTriggerRolls(participant: BattleParticipant, participants: BattleParticipant[] = [participant]): { kind: "extra" | "skip" | null; rolls: number[] } {
  const { value, ignored } = effectiveMorale(participant, participants);

  if (ignored || value === 0) return { kind: null, rolls: [] };

  const { kind, threshold } = moraleThreshold(value, value > 0 ? moraleChanceBonus(participant, participants) : 0);

  return { kind, rolls: kind === "extra" ? Array.from({ length: 11 - threshold }, (_, i) => threshold + i) : Array.from({ length: threshold }, (_, i) => i + 1) };
}
