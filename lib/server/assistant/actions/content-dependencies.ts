import { Prisma } from "@prisma/client";

import type { FieldChange, TargetRef } from "../types";
import { jsonContent } from "./content-snapshot";

import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import { asRecord } from "@/lib/utils/common/json";

export const tableKey = (kind: string) => ({ "spell-groups": "spellGroups", "main-skills": "mainSkills", "artifact-sets": "artifactSets" }[kind] ?? kind);

type Row = Record<string, unknown>;

// Prisma relation metadata is immutable for this process. Preserve table/field
// order; campaign rows, dependency projections and preconditions stay uncached.
const cascadeRelations = new Map<string, Array<{ table: string; column: string; onDelete: string }>>();

for (const table of BUNDLE_TABLES) {
  const model = Prisma.dmmf.datamodel.models.find(entry => entry.name === table.model);

  for (const relation of model?.fields ?? []) {
    if (relation.kind !== "object" || relation.relationFromFields?.length !== 1) continue;

    const entries = cascadeRelations.get(relation.type) ?? [];

    entries.push({ table: table.key, column: relation.relationFromFields[0], onDelete: relation.relationOnDelete ?? (relation.isRequired ? "Restrict" : "SetNull") });
    cascadeRelations.set(relation.type, entries);
  }
}

export const cascadeRelationsOf = (model: string) => cascadeRelations.get(model) ?? [];

export function contentIds(state: unknown, kind: string): string[] {
  const rows = asRecord(asRecord(state).tables)[tableKey(kind)];

  return Array.isArray(rows) ? rows.map((row: Row) => String(row.id)) : [];
}

/** Only relevant rows enter the visible preview; the guard hashes all rows. */
export function contentDependencies(state: unknown, kind: string, id: string | undefined, body: unknown) {
  const root = asRecord(state);

  const tables = asRecord(root.tables);

  const own = Array.isArray(tables[tableKey(kind)]) ? tables[tableKey(kind)] as Row[] : [];

  const ids = new Set<string>(id ? [id] : own.map((row) => String(row.id)));

  const incoming = collectKeysAndStrings(body);

  for (const rows of Object.values(tables)) if (Array.isArray(rows)) for (const row of rows) if (incoming.has(row.id)) ids.add(row.id);

  const matches = (row: unknown) => {
    for (const value of collectKeysAndStrings(row)) {
      if (ids.has(value) || (value.includes("+") && value.split("+").some(part => ids.has(part)))) return true;
    }

    return false;
  };

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(root)) {
    if (key === "tables") result[key] = Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, Array.isArray(rows) ? rows.filter(matches) : []]));
    else if (Array.isArray(value)) result[key] = value.filter(matches);
  }

  return result;
}

/** Prisma FK behavior is shared by native routes and the assistant. JSON/name
 * references remain visible as dependencies; they are not invented cascades. */
export function contentDeleteCascades(state: unknown, kind: string, ids: readonly string[]): FieldChange[] {
  const targetModel = BUNDLE_TABLES.find((table) => table.key === tableKey(kind))?.model;

  const tables = asRecord(asRecord(state).tables);

  const changes: FieldChange[] = [];

  const selected = new Set(ids);

  for (const relation of targetModel ? cascadeRelationsOf(targetModel) : []) {
    const { column } = relation;

    const rows = Array.isArray(tables[relation.table]) ? tables[relation.table] as Row[] : [];

    for (const row of rows) {
      if (!selected.has(String(row[column]))) continue;

      const target: TargetRef = { domain: relation.table, id: String(row.id), name: String(row.name ?? row.title ?? row.id) };

      if (relation.onDelete === "SetNull") changes.push({ target, path: column, before: jsonContent(row[column]), after: null });

      if (relation.onDelete === "Cascade") changes.push({ target, path: "$record", before: jsonContent(row), after: null });
    }
  }

  return changes;
}
