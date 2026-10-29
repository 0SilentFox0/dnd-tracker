import { effectiveEdition, object, str } from "../adapters/shared";
import { array } from "../adapters/shared";
import type { FeatureResolutionContext } from "../feature-resolution";
import { canonicalKey } from "../identity";
import { byteLength, type Compendium, COMPENDIUM_LIMITS, type JsonRecord, normalized } from "../parse";
import { type AdaptedCompendium, type AdaptedEntry, type Adapter, type AdapterContext, type AdaptOptions, issue } from "../types";

export interface AdaptState {
  root: Compendium;
  options: AdaptOptions;
  meta: JsonRecord;
  entries: AdaptedEntry[];
  issues: AdaptedCompendium["issues"];
  sources: JsonRecord[];
  sourceIds: Set<string>;
  blocked: NonNullable<AdaptedCompendium["blocked"]>;
  sourceRows: Map<string, JsonRecord>;
  seen: Set<string>;
  usedOptionals: Set<string>;
  embedded: Record<string, number>;
  featureContext: FeatureResolutionContext;
  selected: number;
}

const CORPUS_KINDS = ["book", "bookData", "adventure", "adventureData"];

export function createAdaptState(root: Compendium, options: AdaptOptions): AdaptState {
  const meta = object(root._meta);

  const sources = array(meta.sources).map(object);

  const issues: AdaptedCompendium["issues"] = [];

  const usedOptionals = new Set<string>();

  const embedded: Record<string, number> = Object.create(null);

  return {
    root,
    options,
    meta,
    entries: [],
    issues,
    sources,
    sourceIds: new Set(sources.map((s) => normalized(str(s.json)))),
    blocked: [],
    sourceRows: new Map(),
    seen: new Set(),
    usedOptionals,
    embedded,
    featureContext: { root, editionFallback: meta.edition, issues, embedded, usedOptionals },
    selected: 0,
  };
}

export const isEnabled = (state: AdaptState, kind: string) =>
  state.options.categories ? state.options.categories.includes(kind) : !CORPUS_KINDS.includes(kind);

export function addEntry(state: AdaptState, kind: string, row: JsonRecord, path: string, adapter: Adapter, parent: string[] = []): AdaptedEntry | undefined {
  const { options, meta, root, issues } = state;

  if (options.excludedPaths?.includes(path)) return;

  if (++state.selected > COMPENDIUM_LIMITS.selected) throw Error("SELECTED_RECORDS");

  const source = str(row.source) || options.sourceBindings?.[path] || "";

  const name = str(row.name);

  if (!source || !name.trim()) {
    state.blocked.push({ path });
    issues.push(issue(!source ? "SOURCE_REQUIRED" : "NAME_REQUIRED", path, "error"));

    return;
  }

  const edition = effectiveEdition(row.edition, meta.edition);

  const key = canonicalKey(kind, name, source, edition, parent);

  if (state.seen.has(key)) {
    issues.push(issue("DUPLICATE_IDENTITY", path, "error"));

    return;
  }

  state.seen.add(key);

  if (row._copy !== undefined || row.inherits !== undefined) {
    state.blocked.push({ key, path });
    issues.push(issue("UNSUPPORTED_COPY", path, "error"));

    return;
  }

  const local = [] as AdaptedEntry["issues"];

  if (!state.sourceIds.has(normalized(source))) local.push(issue("SOURCE_METADATA_MISSING", path, "warning"));

  if (edition === "unknown") local.push(issue("EDITION_UNKNOWN", path, "warning"));

  const ctx: AdapterContext = { root, inputKind: kind, path, source, edition, key, issues: local };

  const result = adapter(row, ctx);

  if (!result) return;

  if (byteLength(result.notes ?? "") > 64 * 1024) local.push(issue("NOTES_SIZE", path, "error", { name: name.slice(0, 80), kb: Math.round(byteLength(result.notes ?? "") / 1024) }));

  const attribution = Object.fromEntries(["page", "additionalSources", "otherSources", "referenceSources"].filter((k) => row[k] !== undefined).map((k) => [k, row[k]]));

  const entry: AdaptedEntry = { key, inputPath: path, inputKind: kind, name, source, edition, body: result.body, refs: result.refs ?? [], notes: result.notes ?? "", kind: result.kind, issues: local, attribution };

  state.sourceRows.set(key, row);
  state.entries.push(entry);
  issues.push(...local);

  return entry;
}
