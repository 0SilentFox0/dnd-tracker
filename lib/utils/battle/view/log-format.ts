import { critTexts } from "./crit-outcome";
import { type DamageBreakdownRow, parseDamageBreakdown } from "./damage-breakdown";

import { ATTACK_KIND_LABELS, type AttackType } from "@/lib/constants/battle";
import { formatText, joinLines } from "@/lib/i18n/text-ref";
import type { Translator } from "@/lib/i18n/translator";
import type { BattleAction } from "@/types/battle";
import type { LogLine } from "@/types/text";

export type LogDetailItem = { kind: "text"; label?: LogLine; text: LogLine } | { kind: "damage"; rows: DamageBreakdownRow[]; raw?: string };

const rowText = (t: Translator, row: DamageBreakdownRow) => [formatText(t, row.label), row.value].filter(Boolean).join(" ");

const itemText = (t: Translator, i: LogDetailItem) =>
  i.kind === "damage" ? "Урон: " + (i.raw ?? i.rows.map((row) => rowText(t, row)).join("; ")) : i.label ? `${formatText(t, i.label)}: ${formatText(t, i.text)}` : formatText(t, i.text);

/** Рядки розгорнутого блоку деталей запису логу */
export function getLogEntryDetailLines(action: BattleAction, t: Translator): string[] {
  return getLogEntryDetailItems(action).map((item) => itemText(t, item));
}

export function getLogEntryDetailItems(action: BattleAction): LogDetailItem[] {
  const d = action.actionDetails;

  const lines: LogDetailItem[] = [];

  const push = (label: LogLine | undefined, text: LogLine) => lines.push({ kind: "text", label, text });

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
    const { name, description } = critTexts(d.criticalEffect, action);

    push("Ефект [d10: " + d.criticalEffect.id + "]", joinLines([name, " — ", description ?? ""]));
  }

  if (d?.damageRows?.length) lines.push({ kind: "damage", rows: d.damageRows });
  else if (d?.damageBreakdown) lines.push({ kind: "damage", raw: d.damageBreakdown, rows: parseDamageBreakdown(d.damageBreakdown) });

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

  if (action.log?.length) push(undefined, joinLines(action.log, " | "));
  else if (action.resultText) push(undefined, action.resultText);

  return lines;
}
