import { diceAverage } from "@/lib/utils/common/dice";

/**
 * Розраховує середню шкоду або лікування заклинання
 */
export function calculateAverageSpellEffect(
  diceCount: number | null | undefined,
  diceType: string | null | undefined
): number {
  return diceAverage(formatSpellDamageDiceRoll(diceCount, diceType) ?? "");
}

/**
 * Форматує середню шкоду/лікування для відображення
 */
export function formatSpellAverage(
  damageType: string,
  averageEffect: number
): string {
  if (averageEffect === 0) return "";

  if (damageType === "damage") {
    return `~${Math.round(averageEffect)} шкоди`;
  } else if (damageType === "heal") {
    return `~${Math.round(averageEffect)} лікування`;
  } else if (damageType === "all") {
    return `~${Math.round(averageEffect)} ефекту`;
  }

  return "";
}

/** Нотація кидка для гравця (наприклад «3d6»). Порожньо, якщо кубиків немає. */
export function formatSpellDamageDiceRoll(
  diceCount: number | null | undefined,
  diceType: string | null | undefined
): string | null {
  const n = diceCount ?? 0;

  if (!diceType || n <= 0) return null;

  const type = String(diceType).trim();

  if (!type) return null;

  return type.startsWith("d") ? `${n}${type}` : `${n}d${type}`;
}

/** Підпис для рядка «що кидати» залежно від типу ефекту заклинання. */
export function spellDamageDiceRollCaption(damageType: string): string {
  if (damageType === "heal") return "Кубики лікування";

  if (damageType === "damage") return "Кубики шкоди";

  if (damageType === "all") return "Кубики ефекту";

  return "Кубики";
}
