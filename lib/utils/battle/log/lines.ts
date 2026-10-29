import { legacyLines } from "./legacy";

import { formatText, joinLines } from "@/lib/i18n/text-ref";
import type { Translator } from "@/lib/i18n/translator";
import type { BattleAction } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function actionLines(action: Pick<BattleAction, "log" | "resultText">): LogLine[] {
  return action.log ?? legacyLines(action.resultText);
}

export function formatBattleLog(t: Translator, action: Pick<BattleAction, "log" | "resultText">, separator = " | "): string {
  return action.log ? action.log.map((line) => formatText(t, line)).join(separator) : action.resultText;
}

/** One string while every line is plain text (legacy output unchanged), the line list once refs appear. */
export function lineText(lines: readonly LogLine[], separator: string): LogLine | LogLine[] {
  return lines.every((line) => typeof line === "string") ? lines.join(separator) : [...lines];
}

/** Plain text stays a legacy `resultText`; refs and line lists become a structured `log` with an empty `resultText`. */
export function logFields(text: LogLine | readonly LogLine[]): { resultText: string; log?: LogLine[] } {
  if (typeof text === "string") return { resultText: text };

  return { resultText: "", log: Array.isArray(text) ? [...(text as LogLine[])] : [text as LogLine] };
}

/** Appends lines to an action, staying a legacy `resultText` while everything is plain text. */
export function withLines<T extends Pick<BattleAction, "log" | "resultText">>(action: T, extra: readonly LogLine[]): T {
  if (extra.length === 0) return action;

  if (!action.log && extra.every((line) => typeof line === "string")) return { ...action, resultText: [action.resultText, ...extra].join(" | ") };

  return { ...action, resultText: "", log: [...actionLines(action), ...extra] };
}

/** Prepends text to the headline (first line) of an action. */
export function withPrefix<T extends Pick<BattleAction, "log" | "resultText">>(action: T, prefix: string): T {
  if (!action.log) return { ...action, resultText: `${prefix}${action.resultText}` };

  const [first = "", ...rest] = action.log;

  return { ...action, log: [joinLines([prefix, first]), ...rest] };
}
