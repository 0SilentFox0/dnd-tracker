import { type DamageBreakdownRow, parseDamageBreakdown } from "./damage-breakdown";

import { ATTACK_KIND_LABELS, type AttackType } from "@/lib/constants/battle";
import type { BattleAction } from "@/types/battle";

export type LogDetailItem = { kind: "text"; label?: string; text: string } | { kind: "damage"; raw: string; rows: DamageBreakdownRow[] };

const itemText = (i: LogDetailItem) => (i.kind === "damage" ? "Урон: " + i.raw : i.label ? `${i.label}: ${i.text}` : i.text);

/** Рядки розгорнутого блоку деталей запису логу */
export function getLogEntryDetailLines(action: BattleAction): string[] {
  return getLogEntryDetailItems(action).map(itemText);
}

export function getLogEntryDetailItems(action: BattleAction): LogDetailItem[] {
  const d = action.actionDetails;

  const lines: LogDetailItem[] = [];

  const push = (label: string | undefined, text: string) => lines.push({ kind: "text", label, text });

  if (action.actionType === "attack" && d?.attackKind) {
    push("Тип", (ATTACK_KIND_LABELS[d.attackKind as AttackType] ?? d.attackKind) + " атака");
  }

  if (d?.weaponName) push("Зброя", d.weaponName);

  if (d?.attackRoll != null) {
    const bonus = d.attackBonus != null ? " + " + d.attackBonus : "";

    push("Кидок атаки", d.attackRoll + bonus + " = " + (d.totalAttackValue ?? ""));
  }

  if (d?.targetAC != null) push("КЛ цілі", String(d.targetAC));

  if (d?.isHit === true) push(undefined, "Попадання");

  if (d?.isCritical === true) push(undefined, "Критичне!");

  if (d?.isCriticalFail === true) push(undefined, "Критичний провал");

  if (d?.criticalEffect) {
    push("Ефект [d10: " + d.criticalEffect.id + "]", d.criticalEffect.name + " — " + d.criticalEffect.description);
  }

  if (d?.damageBreakdown) lines.push({ kind: "damage", raw: d.damageBreakdown, rows: parseDamageBreakdown(d.damageBreakdown) });

  if (d?.spellName) {
    const level = d.spellLevel != null ? " (рівень " + d.spellLevel + ")" : "";

    push("Заклинання", d.spellName + level);
  }

  if (d?.totalHealing != null) push("Лікування", "+" + d.totalHealing);

  if (action.hpChanges?.length) {
    action.hpChanges.forEach((h) => {
      const sign = h.change > 0 ? "-" : "+";

      push(h.participantName, sign + Math.abs(h.change) + " HP");
    });
  }

  if (d?.d10Roll != null) push("Кидок d10", String(d.d10Roll));

  if (action.resultText) push(undefined, action.resultText);

  return lines;
}
