import { parse } from "csv-parse/browser/esm/sync";

import { guardFormula, isEmptyValue } from "./values";

import { isRecord } from "@/lib/utils/common/is-record";
import type { ParsedTable } from "@/types/content-import";

export class ImportFileError extends Error {}

const DELIMITERS = [";", "\t", ","] as const;

const BOM = /^﻿/;

export function detectDelimiter(firstLine: string): string {
  const counts = new Map<string, number>();

  let quoted = false;

  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (DELIMITERS as readonly string[]).includes(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }

  let best = ",";

  let max = 0;

  for (const d of DELIMITERS) {
    const n = counts.get(d) ?? 0;

    if (n > max) {
      best = d;
      max = n;
    }
  }

  return best;
}

// the old unit import dropped one pair of quotes around a whole cell ("""text""" from spreadsheet exports)
const unwrapQuotes = (v: string) => (v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v);

function uniqueHeaders(raw: readonly string[]): string[] {
  const seen = new Map<string, number>();

  return raw.map((h, i) => {
    const base = h.trim() || `Колонка ${i + 1}`;

    const n = (seen.get(base) ?? 0) + 1;

    seen.set(base, n);

    return n === 1 ? base : `${base} (${n})`;
  });
}

function parseCsv(text: string): ParsedTable {
  const sep = /^sep=(.)[ \t]*\r?\n/i.exec(text.replace(BOM, ""));

  const body = text.replace(BOM, "").replace(/^sep=.[ \t]*\r?\n/i, "");

  const delimiter = sep?.[1] ?? detectDelimiter(body.split(/\r?\n/, 1)[0] ?? "");

  let records: string[][];

  try {
    records = parse(body, { delimiter, relax_column_count: true, relax_quotes: true, skip_empty_lines: true, trim: true }) as string[][];
  } catch (error) {
    throw new ImportFileError(`Не вдалося прочитати CSV: ${error instanceof Error ? error.message : "помилка формату"}`);
  }

  const [head, ...data] = records;

  if (!head) throw new ImportFileError("Файл порожній");

  const headers = uniqueHeaders(head);

  const rows = data.filter((cells) => cells.some((c) => !isEmptyValue(c))).map((cells) => Object.fromEntries(headers.map((h, i) => [h, unwrapQuotes(cells[i] ?? "")])));

  return { format: "csv", headers, rows };
}

function parseJsonTable(text: string): ParsedTable {
  let data: unknown;

  try {
    data = JSON.parse(text.replace(BOM, ""));
  } catch {
    throw new ImportFileError("Некоректний JSON");
  }

  const list = Array.isArray(data) ? data : [data];

  if (!list.every(isRecord)) throw new ImportFileError("JSON має бути масивом об'єктів або одним об'єктом");

  const headers: string[] = [];

  for (const row of list) {
    for (const key of Object.keys(row)) if (!headers.includes(key)) headers.push(key);
  }

  return { format: "json", headers, rows: list };
}

export function parseTable(text: string, fileName = ""): ParsedTable {
  const start = text.replace(BOM, "").trimStart();

  if (start === "") throw new ImportFileError("Файл порожній");

  const table = /\.json$/i.test(fileName) || start.startsWith("[") || start.startsWith("{") ? parseJsonTable(text) : parseCsv(text);

  if (table.rows.length === 0) throw new ImportFileError("У файлі немає рядків з даними");

  return table;
}

const NEEDS_QUOTES = /[";,\t\r\n]|^\s|\s$/;

const csvCell = (raw: string) => {
  const v = guardFormula(raw);

  return NEEDS_QUOTES.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  return `﻿${[headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

const encoder = new TextEncoder();

export function chunkRows<T>(rows: readonly T[], maxRows: number, maxBytes: number): T[][] {
  const chunks: T[][] = [];

  let current: T[] = [];

  let bytes = 0;

  for (const row of rows) {
    const size = encoder.encode(JSON.stringify(row)).length;

    if (current.length > 0 && (current.length >= maxRows || bytes + size > maxBytes)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }

    current.push(row);
    bytes += size;
  }

  if (current.length > 0) chunks.push(current);

  return chunks;
}
