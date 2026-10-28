import { effectiveMorale, moraleChanceBonus } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleParticipant } from "@/types/battle";

export interface MoraleCheckResult {
  shouldSkipTurn: boolean;
  hasExtraTurn: boolean;
  message: string;
  /** true = перевірка на додатковий хід (+мораль), false = перевірка на пропуск (-мораль) */
  moralePositive: boolean;
}

/** Межа d10: позитивна мораль +N — додатковий хід на ≥ 11−N, негативна −N — пропуск на ≤ N. */
function moraleThreshold(value: number): { kind: "extra" | "skip"; threshold: number } {
  const n = Math.min(10, Math.abs(value));

  return value > 0 ? { kind: "extra", threshold: 11 - n } : { kind: "skip", threshold: n };
}

export function checkMorale(
  participant: BattleParticipant,
  d10Roll: number,
  participants: BattleParticipant[] = [participant],
  rng: () => number = Math.random,
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

  const { threshold } = moraleThreshold(currentMorale);

  const chance = Math.abs(currentMorale) * 10;

  if (currentMorale > 0) {
    const bonus = moraleChanceBonus(participant, participants);

    // d10 дає кроки по 10 %; бонус лідерства добирається другим кидком серед невдач, тож сумарний шанс = мораль·10 % + бонус
    const bonusHit = d10Roll < threshold && bonus > 0 && chance < 100 && rng() < Math.min(1, bonus / (100 - chance));

    if (d10Roll >= threshold || bonusHit) {
      result.hasExtraTurn = true;
      result.message = `⭐ ${participant.basicInfo.name}: додатковий хід! (Мораль +${currentMorale}, кидок: ${d10Roll}, потрібно: >=${threshold}${bonusHit ? `, бонус лідерства +${bonus}%` : ""})`;
    } else {
      result.message = `${participant.basicInfo.name}: без додаткового ходу (Мораль +${currentMorale}, кидок: ${d10Roll}, потрібно: >=${threshold}${bonus > 0 ? `; бонус лідерства +${bonus}% не спрацював` : ""})`;
    }
  } else {
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

  const { kind, threshold } = moraleThreshold(value);

  return { kind, rolls: kind === "extra" ? Array.from({ length: 11 - threshold }, (_, i) => threshold + i) : Array.from({ length: threshold }, (_, i) => i + 1) };
}
