import { formatFieldValue, isEmptyValue, normalizeHeader, parseFieldValue } from "./values";

import type { ImportField, ImportIssue, ImportKind, ImportMapping, ImportRecord, ImportSpec } from "@/types/content-import";

type Converted = { value: ImportRecord; issues: ImportIssue[] };

export const nameKey = (name: string) => name.trim().toLocaleLowerCase("uk");

const BY_KEY = new WeakMap<readonly ImportField[], Map<string, ImportField>>();

function fieldsByKey(fields: readonly ImportField[]): Map<string, ImportField> {
  let byKey = BY_KEY.get(fields);

  if (!byKey) BY_KEY.set(fields, (byKey = new Map(fields.map((f) => [f.key, f]))));

  return byKey;
}

export function autoMap(headers: readonly string[], fields: readonly ImportField[]): ImportMapping {
  const index = new Map<string, string>();

  for (const field of fields) {
    for (const alias of [field.key, field.label, ...field.aliases]) {
      const key = normalizeHeader(alias);

      if (!index.has(key)) index.set(key, field.key);
    }
  }

  return Object.fromEntries(headers.map((h) => [h, index.get(normalizeHeader(h)) ?? null]));
}

export function applyMapping(row: Record<string, unknown>, mapping: ImportMapping, fields: readonly ImportField[]): Converted {
  const byKey = fieldsByKey(fields);

  const value: ImportRecord = {};

  const issues: ImportIssue[] = [];

  for (const [header, key] of Object.entries(mapping)) {
    const field = key ? byKey.get(key) : undefined;

    const cell = row[header];

    if (!field || isEmptyValue(cell)) continue;

    const prev = value[field.key];

    if (prev === undefined) value[field.key] = cell;
    else if (field.type === "abilitiesText" && typeof prev === "string" && typeof cell === "string") value[field.key] = `${prev}. ${cell}`;
    else if ((field.type === "list" || field.type === "refList") && typeof prev === "string" && typeof cell === "string") value[field.key] = `${prev}|${cell}`;
    else issues.push({ field: field.key, level: "warning", message: `Кілька колонок для «${field.label}» — взято першу непорожню` });
  }

  return { value, issues };
}

export function coerceRecord(record: ImportRecord, fields: readonly ImportField[]): Converted {
  const byKey = fieldsByKey(fields);

  const value: ImportRecord = {};

  const issues: ImportIssue[] = [];

  for (const [key, raw] of Object.entries(record)) {
    const field = byKey.get(key);

    if (!field) {
      issues.push({ field: key, level: "warning", message: `Невідоме поле «${key}» — пропущено` });
      continue;
    }

    const parsed = parseFieldValue(field, raw);

    if (parsed.issue && field.required) issues.push({ field: key, level: "error", message: `${field.label}: ${parsed.issue}` });
    else if (parsed.issue) issues.push({ field: key, level: "warning", message: `Колонка «${field.label}»: ${parsed.issue} — значення «${String(raw).slice(0, 40)}» пропущено` });
    else if (parsed.value !== undefined) value[key] = parsed.value;

    if (parsed.warning) issues.push({ field: key, level: "warning", message: `Колонка «${field.label}»: ${parsed.warning}` });
  }

  return { value, issues };
}

export function transformRow(row: Record<string, unknown>, mapping: ImportMapping, fields: readonly ImportField[]): Converted {
  const mapped = applyMapping(row, mapping, fields);

  const coerced = coerceRecord(mapped.value, fields);

  return { value: coerced.value, issues: [...mapped.issues, ...coerced.issues] };
}

export function recordToCells(spec: ImportSpec, record: ImportRecord, nameOf: (kind: ImportKind, id: string) => string | undefined): string[] {
  return spec.fields.map((f) => formatFieldValue(f, record[f.key], nameOf));
}

export function missingRequired(fields: readonly ImportField[], mapping: ImportMapping): ImportField[] {
  const mapped = new Set(Object.values(mapping));

  return fields.filter((f) => f.required && !mapped.has(f.key));
}

const JOINABLE = new Set<ImportField["type"]>(["abilitiesText", "list", "refList"]);

export function duplicateTargets(fields: readonly ImportField[], mapping: ImportMapping): ImportField[] {
  const counts = new Map<string, number>();

  for (const key of Object.values(mapping)) if (key) counts.set(key, (counts.get(key) ?? 0) + 1);

  return fields.filter((f) => (counts.get(f.key) ?? 0) > 1 && !JOINABLE.has(f.type));
}
