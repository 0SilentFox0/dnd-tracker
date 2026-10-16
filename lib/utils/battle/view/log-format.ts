import { ATTACK_KIND_LABELS, type AttackType, BATTLE_ACTION_LABELS } from "@/lib/constants/battle";
import { capitalize } from "@/lib/utils/common/text";
import type { BattleAction } from "@/types/battle";

/**
 * Отримує деталізований ярлик для атаки/заклинання
 */
function getActionSubLabel(action: BattleAction): string {
  const d = action.actionDetails;

  if (action.actionType === "attack" && d?.attackKind) {
    return ATTACK_KIND_LABELS[d.attackKind as AttackType] ?? d.attackKind;
  }

  if (action.actionType === "spell" && d?.spellName) {
    return "Магія";
  }

  if (action.actionType === "bonus_action" && d?.skillName) {
    return "Бонус";
  }

  return "";
}

/**
 * Форматує один запис логу в один рядок для превью
 * Приклад: "Аграїл → Айвен: [Ближня] 23 урону"
 */
export function formatLogEntry(action: BattleAction): string {
  if (action.actionType === "retaliation") return action.resultText;

  const targets =
    action.targets?.length > 0
      ? action.targets.map((t) => t.participantName).join(", ")
      : "";

  const subLabel = getActionSubLabel(action);

  const subPrefix = subLabel ? `[${subLabel}] ` : "";

  const d = action.actionDetails;

  if (action.actionType === "attack") {
    const damage = d?.totalDamage ?? action.hpChanges?.[0]?.change;

    if (targets && damage != null && damage > 0) {
      return `${action.actorName} → ${targets}: ${subPrefix}${damage} урону`;
    }

    if (action.resultText) {
      return `${action.actorName} → ${targets}: ${action.resultText}`;
    }
  }

  if (action.actionType === "spell") {
    const damage = d?.totalDamage ?? action.hpChanges?.[0]?.change;

    const healing = d?.totalHealing;

    if (targets && damage != null && damage > 0) {
      return `${action.actorName} → ${targets}: [Магія] ${damage} урону`;
    }

    if (targets && healing != null && healing > 0) {
      return `${action.actorName} → ${targets}: [Магія] +${healing} HP`;
    }
  }

  const label = capitalize(BATTLE_ACTION_LABELS[action.actionType as keyof typeof BATTLE_ACTION_LABELS] ?? action.actionType);

  const prefix = targets ? label + " → " + targets + ": " : label + ": ";

  if (action.resultText) return prefix + action.resultText;

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
