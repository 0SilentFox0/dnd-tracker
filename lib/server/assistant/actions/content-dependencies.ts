import { Prisma } from "@prisma/client";

import type { FieldChange, TargetRef } from "../types";
import { jsonContent } from "./content-snapshot";

import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";

const tableKey = (kind: string) => ({ "spell-groups": "spellGroups", "main-skills": "mainSkills", "artifact-sets": "artifactSets" }[kind] ?? kind);

type Row = Record<string, unknown>;

const object = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};

export function contentIds(state: unknown, kind: string): string[] {
  const rows = object(object(state).tables)[tableKey(kind)];

  return Array.isArray(rows) ? rows.map((row: Row) => String(row.id)) : [];
}

/** Only relevant rows enter the visible preview; the guard hashes all rows. */
export function contentDependencies(state: unknown, kind: string, id: string | undefined, body: unknown) {
  const root = object(state);

  const tables = object(root.tables);

  const own = Array.isArray(tables[tableKey(kind)]) ? tables[tableKey(kind)] as Row[] : [];

  const ids = new Set<string>(id ? [id] : own.map((row) => String(row.id)));

  const incoming = collectKeysAndStrings(body);

  for (const rows of Object.values(tables)) if (Array.isArray(rows)) for (const row of rows) if (incoming.has(row.id)) ids.add(row.id);

  const matches = (row: unknown) => [...collectKeysAndStrings(row)].some((value) => ids.has(value) || value.split("+").some((part) => ids.has(part)));

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

  const tables = object(object(state).tables);

  const changes: FieldChange[] = [];

  const selected = new Set(ids);

  for (const table of BUNDLE_TABLES) {
    const model = Prisma.dmmf.datamodel.models.find((entry) => entry.name === table.model);

    const relations = model?.fields.filter((field) => field.kind === "object" && field.type === targetModel && field.relationFromFields?.length === 1) ?? [];

    const rows = Array.isArray(tables[table.key]) ? tables[table.key] as Row[] : [];

    for (const relation of relations) {
      const column = relation.relationFromFields![0];

      for (const row of rows) {
        if (!selected.has(String(row[column]))) continue;

        const target: TargetRef = { domain: table.key, id: String(row.id), name: String(row.name ?? row.title ?? row.id) };

        if ((relation.relationOnDelete ?? (relation.isRequired ? "Restrict" : "SetNull")) === "SetNull") changes.push({ target, path: column, before: jsonContent(row[column]), after: null });

        if (relation.relationOnDelete === "Cascade") changes.push({ target, path: "$record", before: jsonContent(row), after: null });
      }
    }
  }

  return changes;
}
