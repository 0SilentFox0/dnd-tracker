import type { Locale } from "@/lib/i18n/config";
import { textOf } from "@/lib/i18n/test/text";
import type { DamageRow } from "@/types/battle";
import type { LogLine } from "@/types/text";

interface TextCarrier {
  resultText?: string;
  log?: LogLine[];
  details?: { log?: LogLine[] };
}

/** Text of an action or a battle event as the viewer reads it (real catalog, `uk` unless told otherwise). */
export function eventTextOf(carrier: TextCarrier, locale?: Locale): string {
  const log = carrier.log ?? carrier.details?.log;

  return log ? log.map((line) => textOf(line, locale)).join(" | ") : (carrier.resultText ?? "");
}

export const textsOf = (lines: readonly LogLine[], locale?: Locale): string[] => lines.map((line) => textOf(line, locale));

export const rowLines = (rows: readonly DamageRow[], locale?: Locale): string[] =>
  rows.map((row) => [textOf(row.label, locale), row.source ? textOf(row.source, locale) : "", row.value ?? ""].filter(Boolean).join(" "));

export const textRows = (rows: readonly DamageRow[], locale?: Locale) =>
  rows.map((row) => ({ ...row, label: textOf(row.label, locale), ...(row.source && { source: textOf(row.source, locale) }) }));
