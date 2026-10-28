import { domainSchemas } from "./domain-schemas";
import { canonicalKey, digest, stableJson } from "./identity";
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
      entry.issues.push(issue("LOCAL_CONFLICT", `${entry.key}.${field}`, "warning", "Залишено локальну зміну; оберіть перезапис у preview за потреби"));
      result[field] = local;
    } else result[field] = mergeValue(local, baseline, incoming);
  }

  return result;
}

export function buildImportPlan(adapted: AdaptedCompendium, context: PlanContext): ImportPlan {
  const writes: PlannedWrite[] = [];

  const excluded = new Set(context.excludedKeys);

  const excludedPaths = [...(adapted.blocked ?? []).filter((b) => b.key && excluded.has(b.key)).map((b) => b.path), ...adapted.entries.filter((e) => excluded.has(e.key)).flatMap((e) => [e.key, ...(e.inputPath ? [e.inputPath] : [])])];

  const errors = adapted.issues.filter((i) => i.severity === "error" && !excludedPaths.some((p) => i.path === p || i.path.startsWith(`${p}.`)));

  const entries = adapted.entries.filter((e) => !excluded.has(e.key)).map((e) => structuredClone(e));

  const byKey = new Map(entries.map((e) => [e.key, e]));

  const existing = new Map(context.existing.map((e) => [e.key, e]));

  const ids = new Map(entries.map((e) => [e.key, existing.get(e.key)?.missing ? `c${digest([context.campaignId, e.key]).slice(0, 24)}` : existing.get(e.key)?.localId ?? `c${digest([context.campaignId, e.key]).slice(0, 24)}`]));

  const states = new Map<string, "visiting" | "done">();

  const planned = new Map<string, PlannedWrite>();

  const refKey = (ref: CompendiumRef) => canonicalKey(ref.kind, ref.name, ref.source, ref.edition, ref.parent);

  const expectedKind = (ref: CompendiumRef): AdaptedEntry["kind"] | undefined => ({ feat: "feats", spell: "spells", class: "classes", race: "races", background: "backgrounds", monster: "units", item: "artifacts", spellSchool: "spell-groups" } as Record<string, AdaptedEntry["kind"]>)[ref.kind] ?? (ref.kind.startsWith("template:") ? ref.kind.slice(9) as AdaptedEntry["kind"] : undefined);

  function resolve(ref: CompendiumRef, owner: AdaptedEntry): { localId: string; body: JsonRecord; key: string } | undefined {
    const key = refKey(ref);

    if (byKey.has(key)) { visit(key);

 const p = planned.get(key);

 return p && { localId: p.localId, body: p.body, key }; }

    const bound = context.bindings?.[key] ?? existing.get(key);

    if (bound && !bound.missing) {
      if (bound.edition && bound.edition !== "unknown" && ref.edition !== "unknown" && bound.edition !== ref.edition && !context.allowMixedEdition) { errors.push(issue("MIXED_EDITION_CONFIRMATION_REQUIRED", owner.key, "error", "Підтвердьте змішування редакцій для явного зіставлення"));

 return; }

      if (bound.kind && expectedKind(ref) && bound.kind !== expectedKind(ref)) { errors.push(issue("BINDING_WRONG_KIND", owner.key, "error", "Зіставте з записом правильного виду"));

 return; }

      if (byKey.has(bound.key)) { visit(bound.key);

 const candidate = planned.get(bound.key);

 return candidate && { localId: candidate.localId, body: candidate.body, key: bound.key }; }

      return { localId: bound.localId, body: bound.body, key: bound.key };
    }

    const error = issue("UNRESOLVED_REF", `${owner.key}.${ref.path.join(".")}`, "error", "Додайте залежність, виберіть явне зіставлення або виключіть залежний запис");

    owner.issues.push(error);
    errors.push(error);

    return undefined;
  }

  function visit(key: string) {
    if (states.get(key) === "done") return;

    if (states.get(key) === "visiting") { errors.push(issue("CYCLIC_REF", key, "error", "Усуньте циклічні механічні посилання"));

 return; }

    const entry = byKey.get(key);

    if (!entry) return;

    states.set(key, "visiting");

    let body = structuredClone(entry.body);

    const resolvedBindings: NonNullable<PlannedWrite["resolvedBindings"]> = Object.create(null);

    for (const ref of entry.refs) {
      const target = resolve(ref, entry);

      if (!target) continue;

      if (expectedKind(ref)) resolvedBindings[refKey(ref)] = { kind: expectedKind(ref)!, id: target.localId };

      if (ref.path[0] === "originFeatId" && target.body.type !== "origin") {
        const err = issue("BACKGROUND_FEAT_INVALID", key, "error", "Зіставте з рисою типу origin");

        errors.push(err); entry.issues.push(err);
      }

      setPath(body, ref.path, target.localId);
    }

    const old = existing.get(key);

    const overwrite = context.overwriteKeys?.includes(key) === true;

    // A disambiguated display name is stable on reimport; original identity is stored separately.
    if (old && old.baseline.name !== entry.name && typeof old.baseline.name === "string" && body.name === entry.name) body.name = old.baseline.name;

    let sourceBody = structuredClone(body);

    body = reconcile(body, old, entry, overwrite);

    if (entry.mergeParent) body = managedProjection(body, sourceBody) as JsonRecord;

    let localId = ids.get(key)!;

    const parent = entry.mergeParent ? resolve(entry.mergeParent, entry) : undefined;

    if (parent && entry.mergeParent) resolvedBindings[refKey(entry.mergeParent)] = { kind: entry.kind, id: parent.localId };

    if (parent) {
      localId = parent.localId;

      const merged = mergeValue(parent.body, {}, body) as JsonRecord;

      const parentWrite = planned.get(parent.key);

      if (parentWrite) { parentWrite.body = merged;

 if (parentWrite.operation === "unchanged") parentWrite.operation = "update"; }
      else {
        const parentEntry: PlannedWrite = { ...entry, provenance: false, inputKind: "mergeParent", key: parent.key, name: String(parent.body.name), body: merged, localId, mergeParent: undefined, operation: "update" };

        planned.set(parent.key, parentEntry); writes.push(parentEntry);
      }
    } else if (!entry.mergeParent) {
      if (typeof body.name === "string") {
        const collision = entries.some((e) => e.key !== key && e.kind === entry.kind && e.name.normalize("NFC").trim().toLowerCase() === entry.name.normalize("NFC").trim().toLowerCase()) || context.occupiedNames?.[entry.kind]?.some((r) => r.id !== localId && r.name.toLowerCase() === entry.name.toLowerCase());

        if (collision && !old) {
          const suffix = ` [${entry.source}; ${entry.edition}]`;

          body.name = `${entry.name.slice(0, Math.max(1, 100 - suffix.length - 9))}-${digest(key).slice(0, 8)}${suffix}`;
        }
      }

      const schema = domainSchemas[entry.kind];

      const parsed = schema?.safeParse(body);

      if (!parsed?.success) {
        for (const err of parsed && !parsed.success ? parsed.error.issues : [{ path: [] }]) errors.push(issue("DOMAIN_SCHEMA", `${key}.${err.path.join(".")}`, "error", "Виправте поле за схемою ресурсу або виключіть запис"));
      } else { body = parsed.data as JsonRecord; sourceBody = schema!.parse({ ...sourceBody, name: body.name }) as JsonRecord; }
    }

    const unchanged = old && !old.missing && stableJson(managedProjection(old.body, body)) === stableJson(body);

    const baseline = structuredClone(sourceBody);

    for (const conflict of entry.issues.filter((i) => i.code === "LOCAL_CONFLICT")) {
      const field = conflict.path.slice(key.length + 1);

      baseline[field] = old?.baseline[field];
    }

    const write: PlannedWrite = { ...entry, body, baseline, resolvedBindings, localId, operation: unchanged ? "unchanged" : old && !old.missing ? "update" : "create", ...(entry.mergeParent && { nested: true }) };

    planned.set(key, write); writes.push(write); states.set(key, "done");
  }

  entries.forEach((e) => visit(e.key));
  // Nested assembly may have changed parent bodies: validate the final bodies again.
  for (const row of writes.filter((r) => !r.nested)) {
    // A dependency alias may point at a row being created by this very plan.
    // Only actual local bindings can turn a derived parent write into an update.
    const previous = context.existing.find((e) => e.key === row.key) ?? Object.values(context.bindings ?? {}).find((e) => e.localId === row.localId && !byKey.has(e.key));

    if (Array.isArray(row.body.subclasses) && row.body.subclasses.length && !row.body.subclassLevel) {
      const levels = row.body.subclasses.map((v) => isRecord(v) && Array.isArray(v.features) ? Math.min(...v.features.map((f) => Number(isRecord(f) && f.level))) : Infinity);

      if (levels.every((l) => Number.isInteger(l) && l > 0 && l <= 20 && l === levels[0])) { row.body.subclassLevel = levels[0];

 if (row.baseline) row.baseline.subclassLevel = levels[0]; }
      else errors.push(issue("SUBCLASS_LEVEL_REQUIRED", row.key, "error", "Задайте однозначний рівень отримання підкласу"));
    }

    const validated = domainSchemas[row.kind]?.safeParse(row.body);

    if (validated?.success) row.body = validated.data as JsonRecord;

    if (previous && !previous.missing) row.operation = stableJson(managedProjection(previous.body, row.body)) === stableJson(row.body) ? "unchanged" : "update";

    if (!validated?.success) errors.push(issue("DOMAIN_SCHEMA", row.key, "error", "Перевірте результат поєднання вкладених записів"));
  }

  const warnings = [...adapted.issues.filter((i) => i.severity !== "error"), ...writes.flatMap((r) => r.issues.filter((i) => i.severity !== "error"))];

  return { writes, errors, warnings, hash: digest({ version: ADAPTER_VERSION, writes, errors, baseline: context.existing.map((r) => [r.key, r.localId, r.body]), bindings: context.bindings ?? {}, settingsHash: context.settingsHash }) };
}
