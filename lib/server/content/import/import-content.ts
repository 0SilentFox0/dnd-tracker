import type { Prisma } from "@prisma/client";

import "server-only";
import { invalidateReference, type ReferenceKindValue } from "@/lib/cache/tags";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS, type ErrorParams } from "@/lib/constants/api-errors";
import type { ContentImportInput } from "@/lib/schemas/content-import";
import { assertCan } from "@/lib/server/content/access";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { loadNames } from "@/lib/server/content/import/names";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit, currentContentWrite } from "@/lib/server/content/write-context";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { isRecord } from "@/lib/utils/common/is-record";
import { coerceRecord, emptyCounts, IMPORT_SPECS, nameKey, refKindsOf } from "@/lib/utils/content/import";
import type { IdName } from "@/types/common";
import type { ImportField, ImportIssue, ImportKind, ImportMode, ImportRecord, ImportReport, ImportRowResult, ImportSpec } from "@/types/content-import";

export interface ImportDeps {
  resource(kind: ImportKind): AnyContentResource;
  loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>;
  invalidate?(kinds: readonly ReferenceKindValue[], campaignId: string): void;
  transactional?: boolean;
}

export const DEFAULT_IMPORT_DEPS: ImportDeps = { resource: (kind) => CONTENT_RESOURCES[kind] as AnyContentResource, loadNames, transactional: true };

export const OFFLINE_IMPORT_DEPS: ImportDeps = { ...DEFAULT_IMPORT_DEPS, invalidate: () => undefined };

type NameIndex = { byName: Map<string, string[]>; ids: Set<string> };

type Plan = { row: number; name?: string; status: ImportRowResult["status"] | "pending"; op?: "create" | "update"; existingId?: string; body?: unknown; issues: ImportIssue[] };

function indexNames(rows: IdName[]): NameIndex {
  const byName = new Map<string, string[]>();

  for (const r of rows) byName.set(nameKey(r.name), [...(byName.get(nameKey(r.name)) ?? []), r.id]);

  return { byName, ids: new Set(rows.map((r) => r.id)) };
}

const err = (message: string, field?: string, extra?: Partial<ImportIssue>): ImportIssue => ({ ...(field && { field }), level: "error", message, ...extra });

const hasError = (issues: ImportIssue[]) => issues.some((i) => i.level === "error");

function resolveRefs(record: ImportRecord, fields: readonly ImportField[], refs: Map<ImportKind, NameIndex>, issues: ImportIssue[], op: "create" | "update") {
  for (const field of fields) {
    const value = record[field.key];

    if (!field.ref || value === undefined) continue;

    const index = refs.get(field.ref);

    const kind = `contentImport.kinds.${field.ref}`;

    const resolve = (v: unknown) => {
      const s = String(v);

      const id = index?.ids.has(s) ? s : index?.byName.get(nameKey(s))?.[0];

      if (!id) issues.push({ field: field.key, level: field.required || field.strictRef ? "error" : "warning", message: "contentImport.issues.refNotFound", params: { field: field.labelKey, value: s, kind } });

      return id;
    };

    if (field.type === "refList" && Array.isArray(value)) {
      const ids = value.map(resolve).filter((id): id is string => !!id);

      if (op === "update" && ids.length < value.length) delete record[field.key];
      else record[field.key] = ids;
    } else {
      const id = resolve(value);

      if (id) record[field.key] = id;
      else if (op === "create") record[field.key] = null;
      else delete record[field.key];
    }
  }
}

function resolveNestedRefs(record: ImportRecord, fields: readonly ImportField[], refs: Map<ImportKind, NameIndex>, issues: ImportIssue[]) {
  for (const field of fields) {
    const nested = field.nestedRef;

    const value = record[field.key];

    if (!nested || value === undefined) continue;

    const index = refs.get(nested.kind);

    const kind = `contentImport.kinds.${nested.kind}`;

    const walk = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(walk);

      if (!isRecord(v)) return v;

      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => {
          if (k !== nested.key || typeof x !== "string") return [k, walk(x)];

          const id = index?.ids.has(x) ? x : index?.byName.get(nameKey(x))?.[0];

          if (!id) issues.push({ field: field.key, level: "error", message: "contentImport.issues.refNotFound", params: { field: field.labelKey, value: x, kind } });

          return [k, id ?? x];
        }),
      );
    };

    record[field.key] = walk(value);
  }
}

type ZodLikeIssue = { path: PropertyKey[]; message: string; minimum?: unknown; maximum?: unknown; params?: unknown };

const bound = (v: unknown) => (typeof v === "number" || typeof v === "bigint" ? Number(v) : undefined);

function zodIssues(error: { issues: ZodLikeIssue[] }): ImportIssue[] {
  return error.issues.map((i) => {
    const minimum = bound(i.minimum);

    const maximum = bound(i.maximum);

    return err(i.message, i.path.map(String).join(".") || undefined, { ...(minimum !== undefined && { minimum }), ...(maximum !== undefined && { maximum }), ...(isRecord(i.params) && { params: i.params as ErrorParams }) });
  });
}

type PlanCtx = { spec: ImportSpec; resource: AnyContentResource; mode: ImportMode; existing: NameIndex; refs: Map<ImportKind, NameIndex>; seen: Set<string> };

function planRow(raw: Record<string, unknown>, row: number, ctx: PlanCtx): Plan {
  const { value: record, issues } = coerceRecord(raw, ctx.spec.fields);

  const name = typeof record.name === "string" ? record.name : undefined;

  if (!name) return { row, status: "error", issues: [...issues, err("contentImport.issues.noName", "name")] };

  const key = nameKey(name);

  if (ctx.seen.has(key)) {
    const message = "contentImport.issues.duplicateName";

    return ctx.mode === "skip" ? { row, name, status: "skipped", issues: [...issues, { level: "warning", message }] } : { row, name, status: "error", issues: [...issues, err(message, "name")] };
  }

  ctx.seen.add(key);

  const matches = ctx.existing.byName.get(key) ?? [];

  if (matches.length > 0 && ctx.mode === "create") return { row, name, status: "error", issues: [...issues, err("contentImport.issues.alreadyExists", "name", { params: { name } })] };

  if (matches.length > 0 && ctx.mode === "skip") return { row, name, status: "skipped", issues };

  const op = matches.length > 0 ? "update" : "create";

  if (matches.length > 1) issues.push({ level: "warning", message: "contentImport.issues.multipleMatches", params: { name } });

  resolveRefs(record, ctx.spec.fields, ctx.refs, issues, op);

  resolveNestedRefs(record, ctx.spec.fields, ctx.refs, issues);

  if (hasError(issues)) return { row, name, status: "error", issues };

  const body = ctx.spec.toBody ? ctx.spec.toBody(record, op) : record;

  const parsed = (op === "create" ? ctx.resource.schemas.create : ctx.resource.schemas.update).safeParse(body);

  if (!parsed.success) return { row, name, status: "error", issues: [...issues, ...zodIssues(parsed.error)] };

  return { row, name, status: "pending", op, existingId: matches[0], body: parsed.data, issues };
}

function contentErrorIssues(error: ContentError): ImportIssue[] {
  const extra = Array.isArray(error.issues)
    ? error.issues.map((i) =>
        isRecord(i) && typeof i.message === "string" ? err(i.message, Array.isArray(i.path) ? i.path.map(String).join(".") || undefined : undefined, { ...(bound(i.minimum) !== undefined && { minimum: bound(i.minimum) }), ...(bound(i.maximum) !== undefined && { maximum: bound(i.maximum) }), ...(isRecord(i.params) && { params: i.params as ErrorParams }) }) : err(typeof i === "string" ? i : JSON.stringify(i)),
      )
    : [];

  return [err(error.message, undefined, error.params && { params: error.params }), ...extra];
}

async function writePlan(resource: AnyContentResource, actor: Actor, plan: Plan) {
  if (plan.op === "create") return resource.create(actor, plan.body);

  const existing = await resource.find(actor, plan.existingId as string, "write");

  if (!existing) throw new ContentError(resource.notFound, 404);

  return resource.update(actor, existing, plan.body);
}

const toResult = ({ row, name, status, op, issues }: Plan): ImportRowResult => ({
  row,
  ...(name && { name }),
  status: status === "pending" ? (op === "update" ? "updated" : "created") : status,
  issues,
});

function report(dryRun: boolean, results: ImportRowResult[]): ImportReport {
  const counts = emptyCounts();

  for (const r of results) counts[r.status] += 1;

  return { dryRun, results, counts };
}

export async function importContent(actor: Actor, kind: ImportKind, input: ContentImportInput, deps: ImportDeps = DEFAULT_IMPORT_DEPS): Promise<ImportReport> {
  assertCan(actor, NEED.write);

  const spec = IMPORT_SPECS[kind];

  const resource = deps.resource(kind);

  const refKinds = refKindsOf(spec);

  const [own, ...refLists] = await Promise.all([deps.loadNames(actor.campaignId, kind), ...refKinds.map((k) => deps.loadNames(actor.campaignId, k))]);

  const ctx: PlanCtx = { spec, resource, mode: input.mode, existing: indexNames(own), refs: new Map(refKinds.map((k, i) => [k, indexNames(refLists[i])])), seen: new Set() };

  const plans = input.rows.map((raw, i) => planRow(raw, i + 1, ctx));

  if (input.dryRun) return report(true, plans.map(toResult));

  const results: ImportRowResult[] = [];

  let wrote = false;

  for (const plan of plans) {
    if (plan.status !== "pending") {
      results.push(toResult(plan));
      continue;
    }

    try {
      if (plan.op === "create" && resource.prepareCreate) plan.body = await resource.prepareCreate(actor, plan.body);

      if (plan.op === "update" && resource.prepareUpdate) {
        const current = await resource.find(actor, plan.existingId as string, "write");

        if (!current) throw new ContentError(resource.notFound, 404);

        plan.body = await resource.prepareUpdate(actor, current, plan.body);
      }

      if (deps.transactional) {
        const current = currentContentWrite();

        if (current) {
          const tx = current.db as Prisma.TransactionClient;

          await tx.$executeRaw`SAVEPOINT assistant_import_row`;
          try {
            await writePlan(resource, actor, plan);
            await tx.$executeRaw`RELEASE SAVEPOINT assistant_import_row`;
          } catch (error) {
            await tx.$executeRaw`ROLLBACK TO SAVEPOINT assistant_import_row`;
            await tx.$executeRaw`RELEASE SAVEPOINT assistant_import_row`;
            throw error;
          }
        } else await withCampaignContentWrite(actor.campaignId, () => writePlan(resource, actor, plan));
      }
      else await writePlan(resource, actor, plan);

      wrote = true;
      results.push(toResult(plan));
    } catch (error) {
      if (!(error instanceof ContentError)) console.error("[content import]", kind, error instanceof Error ? error.name : "unknown");

      results.push({ ...toResult(plan), status: "error", issues: [...plan.issues, ...(error instanceof ContentError ? contentErrorIssues(error) : [err(API_ERRORS.IMPORT_ROW_FAILED)])] });
    }
  }

  if (wrote && resource.invalidates.length > 0) afterContentCommit(() => (deps.invalidate ?? invalidateReference)(resource.invalidates, actor.campaignId));

  return report(false, results);
}

export function compactImportReport(r: ImportReport, limit = 50) {
  const notable = r.results.filter((x) => x.status === "error" || x.issues.length > 0);

  const compact = (n: number) => ({ dryRun: r.dryRun, counts: r.counts, rows: notable.slice(0, n), omitted: Math.max(0, notable.length - n) });

  let n = limit;

  while (n > 1 && JSON.stringify(compact(n)).length > AI_LIMITS.toolResultChars) n = Math.floor(n / 2);

  return compact(n);
}
