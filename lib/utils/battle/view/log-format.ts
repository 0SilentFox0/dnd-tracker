import { ATTACK_KIND_LABELS, type AttackType } from "@/lib/constants/battle";
import type { BattleAction } from "@/types/battle";

/**
 * Повертає масив рядків для розгорнутого блоку деталей запису логу
 */
export function getLogEntryDetailLines(action: BattleAction): string[] {
  const d = action.actionDetails;

  const lines: string[] = [];

  if (action.actionType === "attack" && d?.attackKind) {
    lines.push("Тип: " + (ATTACK_KIND_LABELS[d.attackKind as AttackType] ?? d.attackKind) + " атака");
  }

  if (d?.weaponName) lines.push("Зброя: " + d.weaponName);

  if (d?.attackRoll != null) {
    const bonus = d.attackBonus != null ? " + " + d.attackBonus : "";

    lines.push(
      "Кидок атаки: " +
        d.attackRoll +
        bonus +
        " = " +
        (d.totalAttackValue ?? ""),
    );
  }

  if (d?.targetAC != null) lines.push("КЛ цілі: " + d.targetAC);

  if (d?.isHit === true) lines.push("Попадання");

  if (d?.isCritical === true) lines.push("Критичне!");

  if (d?.isCriticalFail === true) lines.push("Критичний провал");

  if (d?.criticalEffect) {
    lines.push(
      "Ефект [d10: " +
        d.criticalEffect.id +
        "]: " +
        d.criticalEffect.name +
        " — " +
        d.criticalEffect.description,
    );
  }

  if (d?.damageBreakdown) lines.push("Урон: " + d.damageBreakdown);

  if (d?.spellName) {
    const level = d.spellLevel != null ? " (рівень " + d.spellLevel + ")" : "";

    lines.push("Заклинання: " + d.spellName + level);
  }

  if (d?.totalHealing != null) lines.push("Лікування: +" + d.totalHealing);

  if (action.hpChanges?.length) {
    action.hpChanges.forEach((h) => {
      const sign = h.change > 0 ? "-" : "+";

      lines.push(h.participantName + ": " + sign + Math.abs(h.change) + " HP");
    });
  }

  if (d?.d10Roll != null) lines.push("Кидок d10: " + d.d10Roll);

  if (action.resultText) lines.push(action.resultText);

  return lines;
}
