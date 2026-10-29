import { domainSchemas } from "./domain-schemas";
import { canonicalKey, digest, nameKey, sameEdition, sameSource, stableJson } from "./identity";
import type { JsonRecord } from "./parse";
import { type AdaptedCompendium, type AdaptedEntry, type CompendiumRef, type Edition, type ImportIssue, issue } from "./types";

import { isRecord } from "@/lib/utils/common/is-record";

export const ADAPTER_VERSION = "5etools-1";
export interface ExistingEntry { key: string; edition?: Edition; localId: string; body: JsonRecord; baseline: JsonRecord; missing?: boolean; kind?: AdaptedEntry["kind"] }
export interface PlanContext { campaignId: string; allowMixedEdition?: boolean; existing: ExistingEntry[]; bindings?: Record<string, ExistingEntry>; overwriteKeys?: readonly string[]; excludedKeys?: readonly string[]; occupiedNames?: Record<string, Array<{ id: string; name: string }>>; settingsHash?: string }
export interface PlannedWrite extends AdaptedEntry { provenance?: boolean; localId: string; operation: "create" | "update" | "unchanged"; nested?: boolean; baseline?: JsonRecord; resolvedBindings?: Record<string, { kind: AdaptedEntry["kind"]; id: string }> }
export interface ImportPlan { writes: PlannedWrite[]; errors: ImportIssue[]; warnings: ImportIssue[]; hash: string }

function setPath(body: JsonRecord, path: (string | number)[], value: string) {
  let target: unknown = body;

  for (const part of path.slice(0, -1)) target = (target as JsonRecord)[part];

  if (target && path.length) (target as JsonRecord)[path[path.length - 1]] = value;
}

function managedProjection(local: unknown, baseline: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(baseline) && baseline.every((x) => isRecord(x) && typeof x.id === "string")) {
    const ids = new Set(baseline.map((x) => (x as JsonRecord).id));

    return local.filter((x) => isRecord(x) && ids.has(x.id)).map((x) => managedProjection(x, baseline.find((b) => isRecord(b) && b.id === (x as JsonRecord).id)));
  }

  // Id-less arrays of equal length are compared element-wise so schema defaults added on save do not read as local edits.
  if (Array.isArray(local) && Array.isArray(baseline) && local.length === baseline.length) return local.map((x, i) => managedProjection(x, baseline[i]));

  if (isRecord(local) && isRecord(baseline)) return Object.fromEntries(Object.keys(baseline).map((k) => [k, managedProjection(local[k], baseline[k])]));

  return local;
}

function mergeValue(local: unknown, baseline: unknown, incoming: unknown): unknown {
  if (Array.isArray(incoming) && Array.isArray(local) && incoming.every((x) => isRecord(x) && typeof x.id === "string")) {
    const byId = new Map(local.map((x) => [isRecord(x) ? x.id : stableJson(x), x]));

    for (const row of incoming) byId.set((row as JsonRecord).id, mergeValue(byId.get((row as JsonRecord).id), Array.isArray(baseline) ? baseline.find((x) => isRecord(x) && x.id === (row as JsonRecord).id) : undefined, row));

    return [...byId.values()];
  }

  if (isRecord(local) && isRecord(incoming)) return { ...local, ...Object.fromEntries(Object.entries(incoming).map(([k, v]) => [k, mergeValue(local[k], isRecord(baseline) ? baseline[k] : undefined, v)])) };

  return incoming;
}

function reconcile(body: JsonRecord, existing: ExistingEntry | undefined, entry: AdaptedEntry, overwrite: boolean): JsonRecord {
  if (!existing || existing.missing) return body;

  const result: JsonRecord = {};

  for (const [field, incoming] of Object.entries(body)) {
    const local = existing.body[field];

    const baseline = existing.baseline[field];

    const changed = stableJson(managedProjection(local, baseline)) !== stableJson(baseline);

    if (changed && !overwrite && stableJson(local) !== stableJson(incoming)) {
      entry.issues.push(issue("LOCAL_CONFLICT", `${entry.key}.${field}`, "warning"));
      result[field] = local;
    } else result[field] = mergeValue(local, baseline, incoming);
  }

  return result;
}

interface PlanState {
  excludedPaths: string[];
  context: PlanContext;
  writes: PlannedWrite[];
  errors: ImportIssue[];
  entries: AdaptedEntry[];
  byKey: Map<string, AdaptedEntry>;
  existing: Map<string, ExistingEntry>;
  ids: Map<string, string>;
  states: Map<string, "visiting" | "done">;
  planned: Map<string, PlannedWrite>;
  usedNames: Map<string, Set<string>>;
}

type Resolved = { localId: string; body: JsonRecord; key: string };

export const refKey = (ref: CompendiumRef) => canonicalKey(ref.kind, ref.name, ref.source, ref.edition, ref.parent);

const REF_KINDS: Record<string, AdaptedEntry["kind"]> = { feat: "feats", spell: "spells", class: "classes", race: "races", background: "backgrounds", monster: "units", item: "artifacts", spellSchool: "spell-groups" };

export const expectedKind = (ref: CompendiumRef): AdaptedEntry["kind"] | undefined => REF_KINDS[ref.kind] ?? (ref.kind.startsWith("template:") ? ref.kind.slice(9) as AdaptedEntry["kind"] : undefined);

function plannedResolved(ps: PlanState, key: string): Resolved | undefined {
  visitEntry(ps, key);

  const p = ps.planned.get(key);

  return p && { localId: p.localId, body: p.body, key };
}

function resolveBound(ps: PlanState, ref: CompendiumRef, owner: AdaptedEntry, bound: ExistingEntry): Resolved | undefined {
  const { context, errors, byKey } = ps;

  if (bound.edition && bound.edition !== "unknown" && ref.edition !== "unknown" && bound.edition !== ref.edition && !context.allowMixedEdition) {
    errors.push(issue("MIXED_EDITION_CONFIRMATION_REQUIRED", owner.key, "error"));

    return;
  }

  if (bound.edition && bound.edition !== "unknown" && ref.edition !== "unknown" && bound.edition !== ref.edition) owner.issues.push(issue("MIXED_EDITION_WARNING", owner.key, "warning", { variant: "dependency", edition: bound.edition, content: ref.edition }));

  if (bound.kind && expectedKind(ref) && bound.kind !== expectedKind(ref)) {
    errors.push(issue("BINDING_WRONG_KIND", owner.key, "error"));

    return;
  }

  if (byKey.has(bound.key)) return plannedResolved(ps, bound.key);

  return { localId: bound.localId, body: bound.body, key: bound.key };
}

function findOwn(ps: PlanState, ref: CompendiumRef, owner: AdaptedEntry): AdaptedEntry | undefined {
  const candidates = ps.entries.filter((e) => e.key !== owner.key && e.kind === expectedKind(ref) && nameKey(e.name) === nameKey(ref.name));

  return candidates.find((e) => sameSource(e.source, ref.source) && sameEdition(e.edition, ref.edition)) ?? candidates[0];
}

function resolveRef(ps: PlanState, ref: CompendiumRef, owner: AdaptedEntry): Resolved | undefined {
  const key = refKey(ref);

  if (ps.byKey.has(key)) return plannedResolved(ps, key);

  const bound = ps.context.bindings?.[key] ?? ps.existing.get(key);

  if (bound && !bound.missing) return resolveBound(ps, ref, owner, bound);

  const own = findOwn(ps, ref, owner);

  if (own) {
    if (!sameEdition(own.edition, ref.edition)) owner.issues.push(issue("MIXED_EDITION_WARNING", owner.key, "warning", { variant: "reference", name: ref.name, edition: ref.edition, own: own.edition }));
    else if (!sameSource(own.source, ref.source)) owner.issues.push(issue("SOURCE_MISMATCH_WARNING", owner.key, "warning", { name: ref.name, source: ref.source, own: own.source }));

    return plannedResolved(ps, own.key);
  }

  const error = issue("UNRESOLVED_REF", `${owner.key}.${ref.path.join(".")}`, "error", { name: ref.name, kind: ref.kind, owner: owner.name });

  owner.issues.push(error);
  ps.errors.push(error);

  return undefined;
}

function bindRefs(ps: PlanState, entry: AdaptedEntry, body: JsonRecord, resolvedBindings: NonNullable<PlannedWrite["resolvedBindings"]>) {
  for (const ref of entry.refs) {
    const target = resolveRef(ps, ref, entry);

    if (!target) continue;

    const kind = expectedKind(ref);

    if (kind) resolvedBindings[refKey(ref)] = { kind, id: target.localId };

    if (ref.path[0] === "originFeatId" && target.body.type !== "origin") {
      const err = issue("BACKGROUND_FEAT_INVALID", entry.key, "error");

      ps.errors.push(err);
      entry.issues.push(err);
    }

    setPath(body, ref.path, target.localId);
  }
}

function mergeIntoParent(ps: PlanState, entry: AdaptedEntry, parent: Resolved, body: JsonRecord) {
  const merged = mergeValue(parent.body, {}, body) as JsonRecord;

  const parentWrite = ps.planned.get(parent.key);

  if (parentWrite) {
    parentWrite.body = merged;

    if (entry.refs.length > 0) {
      ps.writes.splice(ps.writes.indexOf(parentWrite), 1);
      ps.writes.push(parentWrite);
    }

    if (parentWrite.operation === "unchanged") parentWrite.operation = "update";

    return;
  }

  const parentEntry: PlannedWrite = { ...entry, provenance: false, inputKind: "mergeParent", key: parent.key, name: String(parent.body.name), body: merged, localId: parent.localId, mergeParent: undefined, operation: "update" };

  ps.planned.set(parent.key, parentEntry);
  ps.writes.push(parentEntry);
}

function disambiguateName(ps: PlanState, entry: AdaptedEntry, body: JsonRecord, localId: string, isNew: boolean) {
  if (typeof body.name !== "string") return;

  const lowered = entry.name.normalize("NFC").trim().toLowerCase();

  const collision = ps.entries.some((e) => e.key !== entry.key && e.kind === entry.kind && e.name.normalize("NFC").trim().toLowerCase() === lowered) || ps.context.occupiedNames?.[entry.kind]?.some((r) => r.id !== localId && r.name.toLowerCase() === entry.name.toLowerCase());

  if (!collision || !isNew) return;

  const taken = (name: string) => ps.entries.some((e) => e.kind === entry.kind && e.key !== entry.key && e.name.toLowerCase() === name.toLowerCase()) || ps.context.occupiedNames?.[entry.kind]?.some((r) => r.id !== localId && r.name.toLowerCase() === name.toLowerCase()) || ps.usedNames.get(entry.kind)?.has(name.toLowerCase());

  const room = (suffix: string) => `${entry.name.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;

  const candidates = [` (${entry.source})`, ` (${entry.source}, ${entry.edition})`];

  let name = candidates.map(room).find((n) => !taken(n));

  for (let n = 2; !name; n++) if (!taken(room(` (${entry.source}) ${n}`))) name = room(` (${entry.source}) ${n}`);

  body.name = name;

  if (!ps.usedNames.has(entry.kind)) ps.usedNames.set(entry.kind, new Set());

  ps.usedNames.get(entry.kind)!.add(name.toLowerCase());
}

function validateStandalone(ps: PlanState, entry: AdaptedEntry, body: JsonRecord, sourceBody: JsonRecord) {
  const schema = domainSchemas[entry.kind];

  const parsed = schema?.safeParse(body);

  if (parsed?.success) return { body: parsed.data as JsonRecord, sourceBody: schema!.parse({ ...sourceBody, name: (parsed.data as JsonRecord).name }) as JsonRecord };

  for (const err of parsed && !parsed.success ? parsed.error.issues : [{ path: [] }]) ps.errors.push(issue("DOMAIN_SCHEMA", `${entry.key}.${err.path.join(".")}`, "error"));

  return { body, sourceBody };
}

function visitEntry(ps: PlanState, key: string) {
  if (ps.states.get(key) === "done") return;

  if (ps.states.get(key) === "visiting") {
    ps.errors.push(issue("CYCLIC_REF", key, "error"));

    return;
  }

  const entry = ps.byKey.get(key);

  if (!entry) return;

  ps.states.set(key, "visiting");

  const resolvedBindings: NonNullable<PlannedWrite["resolvedBindings"]> = Object.create(null);

  const bound = structuredClone(entry.body);

  bindRefs(ps, entry, bound, resolvedBindings);

  const old = ps.existing.get(key);

  const { body, sourceBody, localId } = placeEntry(ps, entry, old, bound, resolvedBindings);

  const write = buildWrite(entry, old, { body, sourceBody, localId, resolvedBindings });

  ps.planned.set(key, write);
  ps.writes.push(write);
  ps.states.set(key, "done");
}

function reconcileBody(ps: PlanState, entry: AdaptedEntry, old: ExistingEntry | undefined, bound: JsonRecord) {
  let body = bound;

  const overwrite = ps.context.overwriteKeys?.includes(entry.key) === true;

  // A disambiguated display name is stable on reimport; original identity is stored separately.
  if (old && old.baseline.name !== entry.name && typeof old.baseline.name === "string" && body.name === entry.name) body.name = old.baseline.name;

  const sourceBody = structuredClone(body);

  body = reconcile(body, old, entry, overwrite);

  if (entry.mergeParent) body = managedProjection(body, sourceBody) as JsonRecord;

  return { body, sourceBody };
}

function placeEntry(ps: PlanState, entry: AdaptedEntry, old: ExistingEntry | undefined, bound: JsonRecord, resolvedBindings: NonNullable<PlannedWrite["resolvedBindings"]>) {
  let { body, sourceBody } = reconcileBody(ps, entry, old, bound);

  let localId = ps.ids.get(entry.key)!;

  const parent = entry.mergeParent ? resolveRef(ps, entry.mergeParent, entry) : undefined;

  if (parent && entry.mergeParent) resolvedBindings[refKey(entry.mergeParent)] = { kind: entry.kind, id: parent.localId };

  if (parent) {
    localId = parent.localId;
    mergeIntoParent(ps, entry, parent, body);
  } else if (!entry.mergeParent) {
    disambiguateName(ps, entry, body, localId, !old);
    ({ body, sourceBody } = validateStandalone(ps, entry, body, sourceBody));
  }

  return { body, sourceBody, localId };
}

function buildWrite(entry: AdaptedEntry, old: ExistingEntry | undefined, placed: { body: JsonRecord; sourceBody: JsonRecord; localId: string; resolvedBindings: NonNullable<PlannedWrite["resolvedBindings"]> }): PlannedWrite {
  const { body, sourceBody, localId, resolvedBindings } = placed;

  const unchanged = old && !old.missing && stableJson(managedProjection(old.body, body)) === stableJson(body);

  const baseline = structuredClone(sourceBody);

  for (const conflict of entry.issues.filter((i) => i.code === "LOCAL_CONFLICT")) {
    const field = conflict.path.slice(entry.key.length + 1);

    baseline[field] = old?.baseline[field];
  }

  return { ...entry, body, baseline, resolvedBindings, localId, operation: unchanged ? "unchanged" : old && !old.missing ? "update" : "create", ...(entry.mergeParent && { nested: true }) };
}

function resolveSubclassLevel(ps: PlanState, row: PlannedWrite) {
  if (!Array.isArray(row.body.subclasses) || !row.body.subclasses.length || row.body.subclassLevel) return;

  const levels = row.body.subclasses.map((v) => isRecord(v) && Array.isArray(v.features) ? Math.min(...v.features.map((f) => Number(isRecord(f) && f.level))) : Infinity);

  if (levels.every((l) => Number.isInteger(l) && l > 0 && l <= 20 && l === levels[0])) {
    row.body.subclassLevel = levels[0];

    if (row.baseline) row.baseline.subclassLevel = levels[0];
  } else ps.errors.push(issue("SUBCLASS_LEVEL_REQUIRED", row.key, "error"));
}

/** Nested assembly may have changed parent bodies: validate the final bodies again. */
function revalidateWrites(ps: PlanState) {
  for (const row of ps.writes.filter((r) => !r.nested)) {
    // A dependency alias may point at a row being created by this very plan; only actual local bindings can turn a derived parent write into an update.
    const previous = ps.context.existing.find((e) => e.key === row.key) ?? Object.values(ps.context.bindings ?? {}).find((e) => e.localId === row.localId && !ps.byKey.has(e.key));

    resolveSubclassLevel(ps, row);

    const validated = domainSchemas[row.kind]?.safeParse(row.body);

    if (validated?.success) row.body = validated.data as JsonRecord;

    if (previous && !previous.missing) row.operation = stableJson(managedProjection(previous.body, row.body)) === stableJson(row.body) ? "unchanged" : "update";

    if (!validated?.success) ps.errors.push(issue("DOMAIN_SCHEMA", row.key, "error", { variant: "combined" }));
  }
}

function reuseNamedSchools(entries: AdaptedEntry[], context: PlanContext, existing: Map<string, ExistingEntry>) {
  const bindings = { ...context.bindings };

  const kept = entries.filter((e) => {
    const row = e.kind === "spell-groups" && !existing.has(e.key) && !bindings[e.key] ? context.occupiedNames?.["spell-groups"]?.find((r) => nameKey(r.name) === nameKey(e.name)) : undefined;

    if (row) bindings[e.key] = { key: e.key, edition: e.edition, kind: e.kind, localId: row.id, body: { name: row.name }, baseline: { name: row.name } };

    return !row;
  });

  return { entries: kept, context: { ...context, bindings } };
}

const isExcludedPath = (excludedPaths: string[], path: string) => excludedPaths.some((p) => path === p || path.startsWith(`${p}.`));

function createPlanState(adapted: AdaptedCompendium, context: PlanContext): PlanState {
  const excluded = new Set(context.excludedKeys);

  const excludedPaths = [...(adapted.blocked ?? []).filter((b) => b.key && excluded.has(b.key)).map((b) => b.path), ...adapted.entries.filter((e) => excluded.has(e.key)).flatMap((e) => [e.key, ...(e.inputPath ? [e.inputPath] : [])])];

  const errors = adapted.issues.filter((i) => i.severity === "error" && !isExcludedPath(excludedPaths, i.path));

  const existing = new Map(context.existing.map((e) => [e.key, e]));

  const reused = reuseNamedSchools(adapted.entries.filter((e) => !excluded.has(e.key)), context, existing);

  context = reused.context;

  const entries = reused.entries.map((e) => structuredClone(e));

  const fresh = (key: string) => `c${digest([context.campaignId, key]).slice(0, 24)}`;

  const ids = new Map(entries.map((e) => [e.key, existing.get(e.key)?.missing ? fresh(e.key) : existing.get(e.key)?.localId ?? fresh(e.key)]));

  return { context, excludedPaths, writes: [], errors, entries, byKey: new Map(entries.map((e) => [e.key, e])), existing, ids, states: new Map(), planned: new Map(), usedNames: new Map() };
}

export function buildImportPlan(adapted: AdaptedCompendium, context: PlanContext): ImportPlan {
  const ps = createPlanState(adapted, context);

  ps.entries.forEach((e) => visitEntry(ps, e.key));
  revalidateWrites(ps);

  const { writes, errors } = ps;

  const warnings = [...adapted.issues.filter((i) => i.severity !== "error" && !isExcludedPath(ps.excludedPaths, i.path)), ...writes.flatMap((r) => r.issues.filter((i) => i.severity !== "error"))];

  return { writes, errors, warnings, hash: digest({ version: ADAPTER_VERSION, writes, errors, baseline: context.existing.map((r) => [r.key, r.localId, r.body]), bindings: context.bindings ?? {}, settingsHash: context.settingsHash }) };
}
