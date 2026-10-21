import { effectiveMorale, moraleChanceBonus } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleParticipant } from "@/types/battle";

export interface MoraleCheckResult {
  shouldSkipTurn: boolean;
  hasExtraTurn: boolean;
  message: string;
  /** true = перевірка на додатковий хід (+мораль), false = перевірка на пропуск (-мораль) */
  moralePositive: boolean;
}

/** Межа d10: позитивна мораль +N — додатковий хід на ≥ 11−N, кожні повні 10 % лідерства знижують її на грань; негативна −N — пропуск на ≤ N. */
function moraleThreshold(value: number, bonusPercent = 0): { kind: "extra" | "skip"; threshold: number } {
  const n = Math.min(10, Math.abs(value));

  return value > 0 ? { kind: "extra", threshold: Math.max(1, 11 - n - Math.floor(bonusPercent / 10)) } : { kind: "skip", threshold: n };
}

export function checkMorale(
  participant: BattleParticipant,
  d10Roll: number,
  participants: BattleParticipant[] = [participant],
): MoraleCheckResult {
  const { value: currentMorale, ignored } = effectiveMorale(participant, participants);

  const result: MoraleCheckResult = {
    shouldSkipTurn: false,
    hasExtraTurn: false,
    message: "",
    moralePositive: currentMorale > 0,
  };

  if (ignored) {
    return { ...result, message: `${participant.basicInfo.name}: мораль не діє` };
  }

  if (currentMorale === 0) {
    return {
      ...result,
      message: `${participant.basicInfo.name} має нейтральну мораль`,
    };
  }

  if (currentMorale > 0) {
    const bonus = moraleChanceBonus(participant, participants);

    const { threshold } = moraleThreshold(currentMorale, bonus);

    const detail = `Мораль +${currentMorale}${bonus > 0 ? `, лідерство +${bonus}%` : ""}, кидок: ${d10Roll}, потрібно: >=${threshold}`;

    if (d10Roll >= threshold) {
      result.hasExtraTurn = true;
      result.message = `⭐ ${participant.basicInfo.name}: додатковий хід! (${detail})`;
    } else {
      result.message = `${participant.basicInfo.name}: без додаткового ходу (${detail})`;
    }
  } else {
    const { threshold } = moraleThreshold(currentMorale);

    if (d10Roll <= threshold) {
      result.shouldSkipTurn = true;
      result.message = `😔 ${participant.basicInfo.name}: пропуск ходу через низьку мораль (Мораль ${currentMorale}, кидок: ${d10Roll}, пропуск на: <=${threshold})`;
    } else {
      result.message = `${participant.basicInfo.name}: хід не пропущено (Мораль ${currentMorale}, кидок: ${d10Roll}, пропуск на: <=${threshold})`;
    }
  }

  return result;
}

/** Значення d10, на яких спрацює мораль: додатковий хід (позитивна) чи пропуск ходу (негативна). */
export function moraleTriggerRolls(participant: BattleParticipant, participants: BattleParticipant[] = [participant]): { kind: "extra" | "skip" | null; rolls: number[] } {
  const { value, ignored } = effectiveMorale(participant, participants);

  if (ignored || value === 0) return { kind: null, rolls: [] };

  const { kind, threshold } = moraleThreshold(value, value > 0 ? moraleChanceBonus(participant, participants) : 0);

  return { kind, rolls: kind === "extra" ? Array.from({ length: 11 - threshold }, (_, i) => threshold + i) : Array.from({ length: threshold }, (_, i) => i + 1) };
}
