import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import type { BundleTable } from "@/lib/server/templates/bundle";
import { mapStrings } from "@/lib/srd/i18n/catalog";
import { isRecord } from "@/lib/utils/common/is-record";

type Entry = { table: BundleTable; row: Record<string, unknown> };
type NameRef = { table: "classes" | "artifacts"; name: string };

const normalize = (ref: NameRef) => ref.table === "artifacts" ? ref.name.trim().toLowerCase() : ref.name;

const keyOf = (ref: NameRef) => `${ref.table}:${normalize(ref)}`;

const rowName = (row: Record<string, unknown>) => String(row.name ?? row.id);

function references({ table, row }: Entry): NameRef[] {
  const refs: NameRef[] = [];

  mapStrings(row, (key, text, parent, path) => {
    if ((table === "classes" && path.join(".") === "spellList") || (key === "lists" && ((table === "spells" && path.length === 1) || (parent === "spells" && path.includes("choices"))))) refs.push({ table: "classes", name: text });

    return text;
  });

  if (table === "artifacts" && Array.isArray(row.modifiers)) {
    for (const modifier of row.modifiers) {
      if (!isRecord(modifier) || modifier.type !== "itemStats" || typeof modifier.value !== "string") continue;

      let stats: unknown;

      try { stats = JSON.parse(modifier.value); } catch { continue; }

      mapStrings(stats, (_key, text, _parent, path) => {
        if (path.join(".") === "property.appliesTo.bases") refs.push({ table: "artifacts", name: text });

        return text;
      });
    }
  }

  return refs;
}

function providers(entries: Entry[]) {
  const names = new Map<string, Entry[]>();

  for (const entry of entries) {
    if ((entry.table !== "classes" && entry.table !== "artifacts") || typeof entry.row.name !== "string") continue;

    const key = keyOf({ table: entry.table, name: entry.row.name });

    names.set(key, [...names.get(key) ?? [], entry]);
  }

  return names;
}

/** Reject only newly invalid or newly introduced name links; unrelated legacy gaps remain tolerated. */
export function assertSrdNameReferences(before: Entry[], after: Entry[], selectedLocalIds: ReadonlySet<string>): void {
  const oldProviders = providers(before), nextProviders = providers(after);

  const previous = new Map(before.map((entry) => [entry.row.id, entry]));

  const nextById = new Map(after.map((entry) => [entry.row.id, entry]));

  const related = new Set<string>();

  for (const entry of after) {
    const old = previous.get(entry.row.id);

    const oldRefs = old ? references(old) : [];

    const oldKeys = new Set(oldRefs.map(keyOf));

    for (const ref of references(entry)) {
      const key = keyOf(ref);

      if (nextProviders.get(key)?.length === 1) continue;

      const previouslyValid = oldKeys.has(key) && oldProviders.get(key)?.length === 1;

      const introduced = selectedLocalIds.has(String(entry.row.id)) && !oldKeys.has(key);

      if (!previouslyValid && !introduced) continue;

      related.add(rowName(entry.row));
      related.add(ref.name);
      for (const oldRef of oldRefs) {
        for (const provider of oldProviders.get(keyOf(oldRef)) ?? []) {
          related.add(rowName(provider.row));

          const next = nextById.get(provider.row.id);

          if (next) related.add(rowName(next.row));
        }
      }
      for (const provider of nextProviders.get(key) ?? []) related.add(rowName(provider.row));
    }
  }

  if (related.size) throw new ContentError(API_ERRORS.SRD_NAME_REFERENCES, 409, undefined, { rows: [...related].join(", ") });
}
