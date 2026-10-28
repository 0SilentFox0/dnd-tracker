import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { adaptCompendium } from "./adapt";
import { digest } from "./identity";
import { byteLength, COMPENDIUM_LIMITS, CompendiumError, type JsonRecord, parseCompendium } from "./parse";
import { ADAPTER_VERSION, buildImportPlan, type ImportPlan, type PlanContext, type PlannedWrite } from "./plan";
import { type AdaptedEntry, type AdaptOptions, type ImportIssue, issue,type TargetKind } from "./types";

import { remapIds } from "@/lib/server/templates/remap-ids";
import type { Actor } from "@/lib/utils/api/actor";
import { isRecord } from "@/lib/utils/common/is-record";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export interface DependencyChoice { refKey: string; templateId: string; kind: TargetKind; localId: string; edition: "classic" | "one" | "unknown" }
export interface ImportInput extends AdaptOptions { json: string; bindings?: Record<string, { kind: TargetKind; id: string }>; overwriteKeys?: string[]; excludedKeys?: string[]; dependencies?: DependencyChoice[]; allowMixedEdition?: boolean; rulesPatch?: JsonRecord }

const targetKind = z.enum(["units", "spells", "spell-groups", "artifacts", "races", "classes", "feats", "backgrounds", "scenarioPages"]);

const safeKey = z.string().max(2000).refine((s) => !["__proto__", "constructor", "prototype"].includes(s));

const boundedRecord = <T extends z.ZodType>(schema: T) => z.record(safeKey, schema).refine((v) => Object.keys(v).length <= 2000);

export const ImportInputSchema = z.strictObject({
  json: z.string().max(COMPENDIUM_LIMITS.bytes),
  categories: z.array(z.string().min(1).max(100)).max(100).optional(),
  sourceBindings: boundedRecord(z.string().min(1).max(128)).optional(),
  bindings: boundedRecord(z.strictObject({ kind: targetKind, id: z.string().min(1).max(100) })).optional(),
  overwriteKeys: z.array(safeKey).max(2000).optional(),
  excludedKeys: z.array(safeKey).max(2000).optional(),
  excludedPaths: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*\[\d+\]$/)).max(2000).optional(),
  dependencies: z.array(z.strictObject({ refKey: safeKey, templateId: z.string().min(1).max(100), kind: targetKind, localId: z.string().min(1).max(100), edition: z.enum(["classic", "one", "unknown"]) })).max(2000).optional(),
  allowMixedEdition: z.boolean().optional(),
  rulesPatch: RulesetPatchSchema.optional(),
});

function validatedInput(input: ImportInput): ImportInput {
  const parsed = ImportInputSchema.safeParse(input);

  if (!parsed.success) throw new CompendiumError("INVALID_INPUT");

  return parsed.data;
}

export interface CompendiumReport {
  adapterVersion: string;
  runId?: string;
  counts: { created: number; updated: number; unchanged: number; errors: number };
  rows: Array<{ canonicalKey: string; kind: TargetKind; targetId: string; status: string; coverage: "native" | "partial" | "manual"; issues: ImportIssue[] }>;
  nextActions: ImportIssue[];
  readyToImport: boolean;
  readyToPlay: boolean;
  sources: JsonRecord[];
  editionSummary: Record<string, number>;
  countsByCategory: Record<string, { present: number; mapped: number; partial: number; skipped: number }>;
  issueCounts: Record<string, number>;
  omittedIssues: number;
}
export interface RepositoryContext extends PlanContext { extraEntries?: AdaptedEntry[]; hasCharacters?: boolean }
export interface ImportRepository {
  authorize(actor: Actor): Promise<void>;
  loadContext(actor: Actor, input: ImportInput): Promise<RepositoryContext>;
  findRun(actor: Actor, key: string): Promise<{ requestHash: string; report: CompendiumReport } | undefined>;
  transaction<T>(actor: Actor, callback: (repository: ImportRepository) => Promise<T>): Promise<T>;
  write(actor: Actor, row: PlannedWrite): Promise<string>;
  saveEntry(actor: Actor, row: PlannedWrite): Promise<void>;
  saveSources(actor: Actor, sources: JsonRecord[]): Promise<void>;
  saveRun(actor: Actor, key: string, requestHash: string, report: CompendiumReport): Promise<void>;
  applyRules?(actor: Actor, patch: JsonRecord): Promise<void>;
}

const requireActor = (actor: Actor) => { if (!actor.isDM || actor.via !== "session") throw new CompendiumError("FORBIDDEN"); };

function signingKey(secret: string) { if (typeof secret !== "string" || secret.length < 32) throw new CompendiumError("PREVIEW_SECRET_REQUIRED");

 return secret; }

const signature = (body: string, secret: string) => createHmac("sha256", signingKey(secret)).update(body).digest("base64url");

function tokenFor(actor: Actor, fingerprint: string, planHash: string, secret: string) {
  const data = Buffer.from(JSON.stringify({ user: actor.userId, campaign: actor.campaignId, fingerprint, planHash, expires: Date.now() + 15 * 60_000 })).toString("base64url");

  return `${data}.${signature(data, secret)}`;
}

function tokenData(actor: Actor, token: string, fingerprint: string, secret: string): JsonRecord {
  const [body, supplied, extra] = token.split(".");

  if (!body || !supplied || extra || token.length > 4096) throw new CompendiumError("PREVIEW_INVALID");

  const expected = Buffer.from(signature(body, secret));

  const got = Buffer.from(supplied);

  if (got.length !== expected.length || !timingSafeEqual(got, expected)) throw new CompendiumError("PREVIEW_INVALID");

  let data: unknown;

  try { data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new CompendiumError("PREVIEW_INVALID"); }

  if (!isRecord(data) || data.user !== actor.userId || data.campaign !== actor.campaignId || data.fingerprint !== fingerprint || typeof data.expires !== "number" || data.expires < Date.now()) throw new CompendiumError("PREVIEW_STALE");

  return data;
}

function reportOf(plan: ImportPlan, root: JsonRecord, sources: JsonRecord[], embedded: Record<string, number> = {}, hasCharacters?: boolean): CompendiumReport {
  const counts = { created: 0, updated: 0, unchanged: 0, errors: plan.errors.length };

  const unique = new Map<string, ImportIssue>();

  for (const i of [...plan.errors, ...plan.warnings]) unique.set(`${i.code}:${i.path}`, i);

  const allIssues = [...unique.values()];

  if (hasCharacters === false) allIssues.push(issue("CHARACTERS_REQUIRED", "characters", "warning", "Створіть персонажів у наповненій кампанії"));

  const issueCounts: Record<string, number> = Object.create(null);

  for (const entry of allIssues) issueCounts[entry.code] = (issueCounts[entry.code] ?? 0) + 1;

  const nextActions = allIssues.slice(0, 10_000);

  let rowBudget = 10_000;

  const rows = plan.writes.map((r) => {
    if (!r.nested) counts[r.operation === "create" ? "created" : r.operation === "update" ? "updated" : "unchanged"]++;

    const shown = r.issues.slice(0, rowBudget);

    rowBudget -= shown.length;

    return { canonicalKey: r.key, kind: r.kind, targetId: r.localId, status: r.operation, coverage: r.body.executionMode === "manual" ? "manual" as const : r.issues.length || r.notes ? "partial" as const : "native" as const, issues: shown };
  });

  const countsByCategory = Object.fromEntries(Object.entries(root).filter(([, v]) => Array.isArray(v)).map(([kind, v]) => {
    if (["book", "bookData", "adventure", "adventureData"].includes(kind)) {
      const corpus = kind.replace(/Data$/, "");

      const manifests = Array.isArray(root[corpus]) ? root[corpus] as unknown[] : [];

      const chapters = (index: number) => plan.writes.filter(r => r.inputKind === `${corpus}Chapter` && r.inputPath?.startsWith(`${corpus}[${index}].data[`));

      const consumed = (v as unknown[]).map((value, index) => {
        if (!isRecord(value)) return [];

        if (kind === corpus) return chapters(index);

        return manifests.flatMap((manifest, mi) => isRecord(manifest) && manifest.id === value.id && (!value.source || value.source === manifest.source) ? chapters(mi) : []);
      });

      const mapped = consumed.filter(rows => rows.length > 0).length;

      return [kind, { present: (v as unknown[]).length, mapped, partial: consumed.filter(rows => rows.some(r => r.issues.length || r.notes)).length, skipped: (v as unknown[]).length - mapped }];
    }

    const mapped = plan.writes.filter((r) => r.inputKind === kind);

    const total = mapped.length + (embedded[kind] ?? 0);

    return [kind, { present: (v as unknown[]).length, mapped: total, partial: mapped.filter((r) => r.issues.length || r.notes).length, skipped: Math.max(0, (v as unknown[]).length - total) }];
  }));

  const editionSummary: Record<string, number> = Object.create(null);

  for (const row of plan.writes) editionSummary[row.edition] = (editionSummary[row.edition] ?? 0) + 1;

  return { adapterVersion: ADAPTER_VERSION, counts, rows, sources, editionSummary, countsByCategory, issueCounts, omittedIssues: Math.max(0, allIssues.length - nextActions.length), nextActions, readyToImport: plan.errors.length === 0, readyToPlay: hasCharacters !== false && plan.errors.length === 0 && !allIssues.some((i) => /MANUAL|UNRESOLVED|UNKNOWN|UNSUPPORTED/.test(i.code)) };
}

function readInput(input: ImportInput) {
  // Account for JSON escaping in the actual transport, not just source-file bytes.
  if (byteLength(JSON.stringify(input)) > COMPENDIUM_LIMITS.requestBytes) throw new CompendiumError("REQUEST_SIZE");

  const root = parseCompendium(input.json);

  return { root, fingerprint: digest({ ...input, json: root, version: ADAPTER_VERSION }) };
}

async function planFor(actor: Actor, input: ImportInput, root: ReturnType<typeof parseCompendium>, repository: ImportRepository) {
  const started = Date.now();

  const adapted = adaptCompendium(root, input);

  const ctx = await repository.loadContext(actor, input);

  if (ctx.campaignId !== actor.campaignId) throw new CompendiumError("FORBIDDEN");

  const plan = buildImportPlan({ ...adapted, entries: [...adapted.entries, ...(ctx.extraEntries ?? [])] }, { ...ctx, overwriteKeys: input.overwriteKeys, excludedKeys: input.excludedKeys, allowMixedEdition: input.allowMixedEdition });

  if (Date.now() - started > 15_000) throw new CompendiumError("PLANNING_TIMEOUT");

  return { plan, sources: adapted.sources, embedded: adapted.embedded, hasCharacters: ctx.hasCharacters };
}

export async function previewImport(actor: Actor, input: ImportInput, secret: string, repository: ImportRepository) {
  requireActor(actor); signingKey(secret);
  input = validatedInput(input);
  await repository.authorize(actor);

  const { root, fingerprint } = readInput(input);

  const { plan, sources, embedded, hasCharacters } = await planFor(actor, input, root, repository);

  return { token: tokenFor(actor, fingerprint, plan.hash, secret), report: reportOf(plan, root, sources, embedded, hasCharacters) };
}

export async function confirmImport(actor: Actor, input: ImportInput, token: string, idempotencyKey: string, secret: string, repository: ImportRepository): Promise<CompendiumReport> {
  requireActor(actor); signingKey(secret);
  input = validatedInput(input);

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(idempotencyKey)) throw new CompendiumError("IDEMPOTENCY_KEY");

  const { root, fingerprint } = readInput(input);

  const requestHash = digest({ fingerprint, token });

  return repository.transaction(actor, async (tx) => {
    await tx.authorize(actor);

    const prior = await tx.findRun(actor, idempotencyKey);

    if (prior) {
      if (prior.requestHash !== requestHash) throw new CompendiumError("IDEMPOTENCY_CONFLICT");

      return prior.report;
    }

    const signed = tokenData(actor, token, fingerprint, secret);

    const { plan, sources, embedded, hasCharacters } = await planFor(actor, input, root, tx);

    if (signed.planHash !== plan.hash) throw new CompendiumError("PREVIEW_STALE");

    if (plan.errors.length) throw new CompendiumError("PLAN_ERRORS");

    const idMap = new Map<string, string>();

    const applied: PlannedWrite[] = [];

    for (const row of plan.writes) {
      const next = { ...row, body: remapIds(row.body, idMap), localId: idMap.get(row.localId) ?? row.localId };

      if (!row.nested && row.operation !== "unchanged") {
        const actual = await tx.write(actor, next);

        idMap.set(row.localId, actual);
        next.localId = actual;
      }

      applied.push(next);
    }
    for (const row of applied.filter((r) => r.provenance !== false)) await tx.saveEntry(actor, { ...row, body: remapIds(row.body, idMap), baseline: remapIds(row.baseline, idMap), resolvedBindings: remapIds(row.resolvedBindings, idMap), localId: idMap.get(row.localId) ?? row.localId });
    await tx.saveSources(actor, sources);

    if (input.rulesPatch) {
      if (!tx.applyRules) throw new CompendiumError("RULES_UNSUPPORTED");

      await tx.applyRules(actor, input.rulesPatch);
    }

    const report = remapIds(reportOf(plan, root, sources, embedded, hasCharacters), idMap);

    await tx.saveRun(actor, idempotencyKey, requestHash, report);

    return report;
  });
}
