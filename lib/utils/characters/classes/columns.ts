import type { ErrorParams } from "@/lib/constants/api-errors";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { DICE_TERM_PATTERN } from "@/lib/utils/common/dice";
import type { ClassColumn, ResolvedClassEntry } from "@/types/classes";

export type ColumnValue = number | string;

const DIE_ONLY = /^d(\d+)$/i;

const NUMBER = /^([+-]?\d+)/;

export function parseColumnValue(cell: string | undefined): ColumnValue | null {
  const s = (cell ?? "").trim();

  if (!s) return null;

  const die = DIE_ONLY.exec(s);

  if (die) return `1d${die[1]}`;

  const dice = DICE_TERM_PATTERN.exec(s);

  if (dice) return `${dice[1]}d${dice[2]}`;

  const n = NUMBER.exec(s);

  return n ? Number(n[1]) : null;
}

const cellIndex = (level: number) => Math.min(Math.max(level, 1), MAX_CLASS_LEVEL) - 1;

export const columnValueAt = (column: ClassColumn, level: number): ColumnValue | null => parseColumnValue(column.values[cellIndex(level)]);

export function classColumnIssues(columns: readonly ClassColumn[]): { path: (string | number)[]; message: string; params?: ErrorParams }[] {
  const issues: { path: (string | number)[]; message: string; params?: ErrorParams }[] = [];

  const seen = new Set<string>();

  columns.forEach((c, i) => {
    if (seen.has(c.key)) issues.push({ path: [i, "key"], message: "classes.validation.columnKeyRepeated", params: { key: c.key } });

    seen.add(c.key);

    if (!c.pool) return;

    c.values.forEach((v, l) => {
      if (v.trim() && typeof parseColumnValue(v) !== "number") issues.push({ path: [i, "values", l], message: "classes.validation.poolNotNumber", params: { label: c.label, level: l + 1 } });
    });
  });

  return issues;
}

export function parseColumnValuesText(text: string): string[] {
  const cells = text.split(",").map((s) => s.trim());

  return Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => cells[i] ?? "");
}

export function classTableText(entry: { name: string; level: number; columns: readonly ClassColumn[] }): string {
  const cells = entry.columns.flatMap((c) => {
    const raw = c.values[cellIndex(entry.level)]?.trim();

    return raw ? [`${c.label} ${raw}`] : [];
  });

  return [`${entry.name} ${entry.level}`, ...cells].join(" · ");
}

export const classTableLines = (entries: readonly ResolvedClassEntry[]): string[] =>
  entries.flatMap((e) => (e.class ? [classTableText({ name: e.class.name, level: e.level, columns: e.class.columns ?? [] })] : []));
