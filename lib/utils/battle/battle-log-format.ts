/**
 * Утиліти форматування логу бою (BattleLog)
 */

import type { BattleAction } from "@/types/battle";

export const BATTLE_ACTION_LABELS: Record<string, string> = {
  attack: "Атака",
  spell: "Заклинання",
  bonus_action: "Бонусна дія",
  ability: "Здібність",
  end_turn: "Кінець ходу",
  skip_turn: "Пропуск ходу",
  morale_skip: "Пропуск (мораль)",
};

/**
 * Форматує один запис логу в один рядок для превью
 */
export function formatLogEntry(action: BattleAction): string {
  const label = BATTLE_ACTION_LABELS[action.actionType] ?? action.actionType;

  const targets =
    action.targets?.length > 0
      ? action.targets.map((t) => t.participantName).join(", ")
      : "";

  const prefix = targets ? label + " → " + targets + ": " : label + ": ";

  if (action.resultText) return prefix + action.resultText;

  const d = action.actionDetails;

  if (d?.totalDamage != null) return prefix + d.totalDamage + " урону";

  if (d?.totalHealing != null) return prefix + "+" + d.totalHealing + " HP";

  return targets ? label + " → " + targets : label;
}

/**
 * Повертає масив рядків для розгорнутого блоку деталей запису логу
 */
export function getLogEntryDetailLines(action: BattleAction): string[] {
  const d = action.actionDetails;

  const lines: string[] = [];

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
