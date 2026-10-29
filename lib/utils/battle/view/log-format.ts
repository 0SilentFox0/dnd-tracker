import { critTexts } from "./crit-outcome";
import { type DamageBreakdownRow, parseDamageBreakdown } from "./damage-breakdown";

import { dynamicTextRef, formatText, joinLines, textRef } from "@/lib/i18n/text-ref";
import type { Translator } from "@/lib/i18n/translator";
import type { BattleAction } from "@/types/battle";
import type { LogLine } from "@/types/text";

export type LogDetailItem = { kind: "text"; label?: LogLine; text: LogLine } | { kind: "damage"; rows: DamageBreakdownRow[]; raw?: string };

const rowText = (t: Translator, row: DamageBreakdownRow) => [formatText(t, row.label), row.value].filter(Boolean).join(" ");

const itemText = (t: Translator, i: LogDetailItem) =>
  i.kind === "damage" ? formatText(t, textRef("battleLog.details.damage", { rows: i.raw ?? i.rows.map((row) => rowText(t, row)).join("; ") })) : i.label ? `${formatText(t, i.label)}: ${formatText(t, i.text)}` : formatText(t, i.text);

/** Рядки розгорнутого блоку деталей запису логу */
export function getLogEntryDetailLines(action: BattleAction, t: Translator): string[] {
  return getLogEntryDetailItems(action).map((item) => itemText(t, item));
}

export function getLogEntryDetailItems(action: BattleAction): LogDetailItem[] {
  const d = action.actionDetails;

  const lines: LogDetailItem[] = [];

  const push = (label: LogLine | undefined, text: LogLine) => lines.push({ kind: "text", label, text });

  if (action.actionType === "attack" && d?.attackKind) {
    push(textRef("battleLog.details.type"), textRef("battleLog.details.attackOfKind", { kind: dynamicTextRef(`battleCommon.attackKinds.${d.attackKind}`) }));
  }

  if (d?.weaponName) push(textRef("battleLog.details.weapon"), d.weaponName);

  if (d?.attackRoll != null) {
    const bonus = d.attackBonus != null ? " + " + d.attackBonus : "";

    push(textRef("battleLog.details.attackRoll"), d.attackRoll + bonus + " = " + (d.totalAttackValue ?? ""));
  }

  if (d?.targetAC != null) push(textRef("battleLog.details.targetAc"), String(d.targetAC));

  if (d?.isHit === true) push(undefined, textRef("battleLog.details.hit"));

  if (d?.isCritical === true) push(undefined, textRef("battleLog.details.crit"));

  if (d?.isCriticalFail === true) push(undefined, textRef("battleLog.details.critFail"));

  if (d?.criticalEffect) {
    const { name, description } = critTexts(d.criticalEffect, action);

    push(textRef("battleLog.details.effect", { id: d.criticalEffect.id }), joinLines([name, " — ", description ?? ""]));
  }

  if (d?.damageRows?.length) lines.push({ kind: "damage", rows: d.damageRows });
  else if (d?.damageBreakdown) lines.push({ kind: "damage", raw: d.damageBreakdown, rows: parseDamageBreakdown(d.damageBreakdown) });

  if (d?.spellName) {
    push(textRef("battleLog.details.spell"), d.spellLevel != null ? textRef("battleLog.details.spellLevel", { name: d.spellName, level: d.spellLevel }) : d.spellName);
  }

  if (d?.totalHealing != null) push(textRef("battleLog.details.healing"), "+" + d.totalHealing);

  if (action.hpChanges?.length) {
    action.hpChanges.forEach((h) => {
      const sign = h.change > 0 ? "-" : "+";

      push(h.participantName, sign + Math.abs(h.change) + " HP");
    });
  }

  if (d?.d10Roll != null) push(textRef("battleLog.details.d10"), String(d.d10Roll));

  if (action.log?.length) push(undefined, joinLines(action.log, " | "));
  else if (action.resultText) push(undefined, action.resultText);

  return lines;
}
