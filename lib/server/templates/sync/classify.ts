import { BUNDLE_SETTING_KEYS, BUNDLE_TABLES, type BundleTableDef, pick } from "@/lib/server/templates/bundle";
import { collectKeysAndStrings, remapIds } from "@/lib/server/templates/remap-ids";
import { MECHANIC_KEYS, rowHash, settingsHash } from "@/lib/server/templates/sync/hash";
import { indexOf, type SyncIndex } from "@/lib/server/templates/sync/index";
import { getEntry } from "@/lib/server/templates/sync/state";
import { IGNORED_DELETED, type SyncContext, type SyncItem } from "@/lib/server/templates/sync/types";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";
import type { SourceSyncStatus } from "@/types/campaigns";

type Row = Record<string, unknown> & { id: string };

type ItemFields = Pick<SyncItem, "scope" | "key" | "name" | "status" | "changedFields" | "sourceHash"> & Partial<Pick<SyncItem, "localId" | "requires" | "visible">>;

export const rowName = (row: Record<string, unknown>): string => String(row.name ?? row.title ?? row.race ?? row.id);

// S/B/L present → status; null = no change
function pairStatus(s: string, b: string | undefined, l: string): SourceSyncStatus | null {
  if (s === l || s === b) return null;

  if (b === undefined) return "conflict";

  return l === b ? "updated" : "conflict";
}

const changed = (a: Record<string, unknown>, b: Record<string, unknown>, keys: readonly string[]) => keys.filter((k) => k !== "id" && hashJson(a[k] ?? null) !== hashJson(b[k] ?? null));

function item(ctx: SyncContext, fields: ItemFields): SyncItem {
  const ignoredHash = getEntry(ctx.ignored, fields.scope, fields.key);

  return { localId: null, requires: [], visible: true, ...fields, ignored: ignoredHash !== undefined && ignoredHash === (fields.sourceHash ?? IGNORED_DELETED) };
}

export function classify(ctx: SyncContext): SyncItem[] {
  const index = indexOf(ctx);

  return [...BUNDLE_TABLES.flatMap((t) => classifyTable(ctx, t, index)), ...classifyRules(ctx), ...classifySettings(ctx)];
}

function classifyTable(ctx: SyncContext, t: BundleTableDef, index: SyncIndex): SyncItem[] {
  const sourceRows = new Map(ctx.sourceBundle[t.key].map((r) => [r.id, r]));

  const localRows = new Map(index.rowsByTable.get(t.key)!.filter((r) => r.sourceId).map((r) => [r.sourceId!, r]));

  const base = ctx.baseline.tables[t.key] ?? {};

  const keys = new Set([...sourceRows.keys(), ...Object.keys(base), ...localRows.keys()]);

  const out: SyncItem[] = [];

  for (const key of keys) {
    const src = sourceRows.get(key);

    const loc = localRows.get(key);

    const b = base[key];

    const s = src ? rowHash(src, t) : null;

    const locInSource = loc ? (remapIds(pick(loc, t.columns), index.localToSource) as Row) : null;

    const l = locInSource ? rowHash(locInSource, t) : null;

    let status: SourceSyncStatus | null;

    let visible = true;

    if (s && l) status = pairStatus(s, b, l);
    else if (!s && l) status = "deletedInSource";
    else if (s && !l) {
      status = b === undefined ? "new" : "deletedLocally";
      visible = b === undefined || s !== b;
    } else status = null;

    if (!status) continue;

    const requires =
      src && status !== "deletedInSource"
        ? [...collectKeysAndStrings(src)]
            .filter((v) => v !== key && index.sourceIndex.has(v) && !index.sourceToLocal.has(v))
            .map((v) => ({ scope: index.sourceIndex.get(v)!.table, key: v, name: rowName(index.sourceIndex.get(v)!.row) }))
        : [];

    out.push(
      item(ctx, {
        scope: t.key,
        key,
        localId: loc?.id ?? null,
        name: rowName(src ?? loc!),
        status,
        changedFields: src && locInSource ? changed(src, locInSource, t.columns) : [],
        sourceHash: s,
        requires,
        visible,
      }),
    );
  }

  return out;
}

function classifyRules(ctx: SyncContext): SyncItem[] {
  const src = parseRules(ctx.sourceBundle.rules) as Record<string, unknown>;

  const loc = parseRules(ctx.target.rules) as Record<string, unknown>;

  return MECHANIC_KEYS.flatMap((key): SyncItem[] => {
    const s = hashJson(src[key]);

    const status = pairStatus(s, ctx.baseline.rules[key], hashJson(loc[key]));

    if (!status) return [];

    const a = (src[key] ?? {}) as Record<string, unknown>;

    const b = (loc[key] ?? {}) as Record<string, unknown>;

    return [item(ctx, { scope: "rules", key, name: MECHANIC_REGISTRY[key].label, status, changedFields: changed(a, b, [...new Set([...Object.keys(a), ...Object.keys(b)])]), sourceHash: s })];
  });
}

function classifySettings(ctx: SyncContext): SyncItem[] {
  const s = settingsHash(ctx.sourceBundle.settings);

  const status = pairStatus(s, ctx.baseline.settings, settingsHash(ctx.target.settings));

  if (!status) return [];

  return [
    item(ctx, {
      scope: "settings",
      key: "settings",
      name: "Налаштування кампанії",
      status,
      changedFields: changed(ctx.sourceBundle.settings, ctx.target.settings, BUNDLE_SETTING_KEYS),
      sourceHash: s,
    }),
  ];
}
