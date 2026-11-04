import { bypassLayer } from "@/lib/db/content-layer";
import { BUNDLE_TABLES, type BundleTable, pick } from "@/lib/server/templates/bundle";
import { readPreImage } from "@/lib/server/templates/legacy-migration/preimage";
import { referrerRows, REFERRERS } from "@/lib/server/templates/legacy-migration/referrers";
import { cuidTokens, remapDeep, residualKind } from "@/lib/server/templates/legacy-migration/remap";
import { LegacyMigrationError, type MigrationInput, type MigrationPlan, type Row } from "@/lib/server/templates/legacy-migration/types";
import { rowHash } from "@/lib/server/templates/sync/hash";
import { classifyLayered, type LayeredDb, loadLayeredContext } from "@/lib/server/templates/sync/layered";
import type { SyncItem } from "@/lib/server/templates/sync/types";

type Rows = Record<BundleTable, Row[]>;

export type ExposedHashes = Record<BundleTable, Map<string, string>>;

export interface ExposedDiff { table: BundleTable; id: string; kind: "missing" | "extra" | "changed" }

export interface Residuals {
  exact: Array<{ model: string; column: string; count: number }>;
  composite: Array<{ model: string; count: number }>;
  history: Array<{ model: string; count: number }>;
}

export interface ParityDiff { scope: string; key: string; before?: string; after?: string }

const CUID_VALUE = /^c[a-z0-9]{24}$/;

const PARITY_STATUSES: ReadonlySet<string> = new Set(["new", "updated", "conflict", "deletedInSource"]);

const idsOf = (rows: Rows) => new Set(BUNDLE_TABLES.flatMap((t) => rows[t.key].map((r) => r.id)));

function nullDangling(value: unknown, known: ReadonlySet<string>): unknown {
  if (typeof value === "string") return CUID_VALUE.test(value) && !known.has(value) ? null : value;

  if (Array.isArray(value)) return value.map((v) => nullDangling(v, known));

  if (value && typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, nullDangling(v, known)]));

  return value;
}

export async function exposedRows(db: object, campaignId: string): Promise<Rows> {
  const d = db as Record<string, { findMany(args: unknown): Promise<Row[]> }>;

  const out = {} as Rows;

  for (const t of BUNDLE_TABLES) out[t.key] = await d[t.delegate].findMany({ where: { campaignId } });

  return out;
}

export function hashExposed(args: { rows: Rows; known?: ReadonlySet<string> }): ExposedHashes {
  const known = args.known ?? idsOf(args.rows);

  const out = {} as ExposedHashes;

  for (const t of BUNDLE_TABLES) out[t.key] = new Map(args.rows[t.key].map((r) => [r.id, rowHash(nullDangling(pick(r, t.columns), known) as Record<string, unknown>, t)]));

  return out;
}

export async function readExposed(db: object, campaignId: string): Promise<ExposedHashes> {
  return hashExposed({ rows: await exposedRows(db, campaignId) });
}

export function compareExposed(before: ExposedHashes, after: ExposedHashes): ExposedDiff[] {
  const diffs: ExposedDiff[] = [];

  for (const t of BUNDLE_TABLES) {
    const b = before[t.key];

    const a = after[t.key];

    for (const [id, hash] of b) {
      if (!a.has(id)) diffs.push({ table: t.key, id, kind: "missing" });
      else if (a.get(id) !== hash) diffs.push({ table: t.key, id, kind: "changed" });
    }

    for (const id of a.keys()) if (!b.has(id)) diffs.push({ table: t.key, id, kind: "extra" });
  }

  return diffs;
}

export function remapRows(rows: Rows, idMap: ReadonlyMap<string, string>): Rows {
  return Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, rows[t.key].map((r) => remapDeep(r, idMap))])) as Rows;
}

export function compareRows(args: { before: Rows; after: Rows }): ExposedDiff[] {
  const known = new Set([...idsOf(args.before), ...idsOf(args.after)]);

  return compareExposed(hashExposed({ rows: args.before, known }), hashExposed({ rows: args.after, known }));
}

function* stringsOf(value: unknown): Generator<string> {
  if (typeof value === "string") yield value;
  else if (Array.isArray(value)) for (const v of value) yield* stringsOf(v);
  else if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      yield k;
      yield* stringsOf(v);
    }
  }
}

export async function scanResiduals(db: object, args: { campaignId: string; removed: ReadonlySet<string> }): Promise<Residuals> {
  const exact = new Map<string, number>();

  const composite = new Map<string, number>();

  const history = new Map<string, number>();

  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const r of REFERRERS) {
    if (r.mode === "global" || !r.scope) continue;

    const rows = await bypassLayer(() => referrerRows(db, r, args.campaignId));

    for (const row of rows) {
      const exactColumns = new Set<string>();

      let compositeHit = false;

      let historyHit = false;

      for (const [column, value] of Object.entries(row)) {
        if (r.mode === "content" && column === "id") continue;

        for (const text of stringsOf(value)) {
          for (const token of cuidTokens(text)) {
            if (!args.removed.has(token)) continue;

            if (r.mode === "history") historyHit = true;
            else if (residualKind(text, token) === "exact") exactColumns.add(column);
            else compositeHit = true;
          }
        }
      }

      for (const column of exactColumns) bump(exact, `${r.model}\u0000${column}`);

      if (compositeHit) bump(composite, r.model);

      if (historyHit) bump(history, r.model);
    }
  }

  return {
    exact: [...exact].map(([key, count]) => ({ model: key.split("\u0000")[0], column: key.split("\u0000")[1], count })),
    composite: [...composite].map(([model, count]) => ({ model, count })),
    history: [...history].map(([model, count]) => ({ model, count })),
  };
}

const itemKey = (i: Pick<SyncItem, "scope" | "key">) => `${i.scope}\u0000${i.key}`;

export function syncParity(before: SyncItem[], after: SyncItem[]): ParityDiff[] {
  const describe = (i: SyncItem) => `${i.status}|${i.ignored}`;

  const b = new Map(before.filter((i) => PARITY_STATUSES.has(i.status)).map((i) => [itemKey(i), i]));

  const a = new Map(after.filter((i) => PARITY_STATUSES.has(i.status)).map((i) => [itemKey(i), i]));

  const deletedLocally = new Set(before.filter((i) => i.status === "deletedLocally").map(itemKey));

  const diffs: ParityDiff[] = [];

  for (const [k, i] of b) {
    const j = a.get(k);

    if (!j || describe(j) !== describe(i)) diffs.push({ scope: i.scope, key: i.key, before: describe(i), after: j && describe(j) });
  }

  for (const [k, j] of a) if (!b.has(k) && !(j.status === "new" && deletedLocally.has(k))) diffs.push({ scope: j.scope, key: j.key, after: describe(j) });

  return diffs;
}

const removedOf = (idMap: ReadonlyMap<string, string>) => new Set([...idMap].filter(([from, to]) => from !== to).map(([from]) => from));

export async function verifyMigration(db: object, args: { input: MigrationInput; plan: MigrationPlan }): Promise<Pick<Residuals, "composite" | "history">> {
  const { input, plan } = args;

  const { campaignId } = input;

  const residuals = await scanResiduals(db, { campaignId, removed: removedOf(plan.idMap) });

  if (residuals.exact.length > 0) throw new LegacyMigrationError("RESIDUAL_REFS", residuals);

  const exposed = compareRows({ before: remapRows(input.stored, plan.idMap), after: await exposedRows(db, campaignId) });

  const ctx = await loadLayeredContext(db as LayeredDb, campaignId, { sourceId: input.sourceId, baseVersion: input.version });

  const parity = syncParity(input.legacyItems, classifyLayered(ctx));

  if (exposed.length > 0 || parity.length > 0) throw new LegacyMigrationError("VERIFY_MISMATCH", { exposed, parity });

  return { composite: residuals.composite, history: residuals.history };
}

export async function verifyFromPreImage(db: object, path: string): Promise<{ ok: boolean; mismatches: ExposedDiff[]; residuals: Residuals }> {
  const image = await readPreImage(path);

  const idMap = new Map(image.plan.idMap);

  const mismatches = compareRows({ before: remapRows(image.stored, idMap), after: await exposedRows(db, image.campaignId) });

  const residuals = await scanResiduals(db, { campaignId: image.campaignId, removed: removedOf(idMap) });

  return { ok: mismatches.length === 0 && residuals.exact.length === 0, mismatches, residuals };
}
