import { Prisma, type PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

import { baseRowsCache, baseRowsKey, type CampaignLayer, invalidateCampaignLayer, isPlainCampaign, layerStats, markPlainCampaign, type Overlay, overlayCache, overlayKey } from "@/lib/db/layer/cache";
import { BASE_ONLY, campaignRelations, isLayered, type LayerConfig, layeredModels, otherRelationKeys, type Relation } from "@/lib/db/layer/config";
import { orderKeys, sortRows } from "@/lib/db/layer/sort";
import { afterContentCommit, currentContentWrite, currentTransaction, markContentDirty } from "@/lib/server/content/write-context";
import { stableStringify } from "@/lib/utils/battle/store/stable-json";
import { contentRowHash } from "@/lib/utils/content/row-hash";

export { invalidateCampaignLayer, layerStats };

/** Runs `run` against the stored tables only: no base rows, no hides, no id exposure. */
export const bypassLayer = <T>(run: () => Promise<T>): Promise<T> => bypass.run(true, async () => run());

const READS = new Set(["findMany", "findFirst", "findUnique", "findFirstOrThrow", "findUniqueOrThrow", "count", "aggregate"]);

const WRITES = new Set(["update", "updateMany", "delete", "deleteMany"]);

const UNSUPPORTED_OPS = new Set(["upsert", "groupBy", "createManyAndReturn", "updateManyAndReturn"]);

const CAMPAIGN_WRITES = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);

type Row = Record<string, any>;

type Raw = Record<string, any>;

type Query = (args: Row) => Promise<any>;

interface Ctx { raw: Raw; ext: Raw }

const bypass = new AsyncLocalStorage<true>();

/** Overlays may reflect writes that are not committed (or not yet counted in contentVersion) inside a write context or open transaction. */
const overlayCachingAllowed = () => !currentContentWrite() && !currentTransaction();

/** Only the campaign that owns the open write context is bumped; rows written for another campaign (clone, template save) leave it alone. */
const touch = (campaignId: string) => {
  if (currentContentWrite()?.campaignId === campaignId) markContentDirty();
};

const txOrWrite = (): Raw | undefined => (currentContentWrite()?.db as Raw | undefined) ?? (currentTransaction() as Raw | undefined);

const scopeOf = (): object | undefined => (currentContentWrite() as object | undefined) ?? (currentTransaction() as object | undefined);

/** One layer lookup per campaign inside a write context / transaction; outside one every call reads fresh. */
const scoped = new WeakMap<object, Map<string, CampaignLayer | null>>();

const forgetScoped = (campaignId?: string) => {
  const memo = scoped.get(scopeOf() ?? {});

  if (campaignId) memo?.delete(campaignId);
  else memo?.clear();
};

async function campaignLayer(ctx: Ctx, campaignId: string): Promise<CampaignLayer | null> {
  if (isPlainCampaign(campaignId)) return null;

  const scope = scopeOf();

  const memo = scope && scoped.get(scope);

  if (memo?.has(campaignId)) return memo.get(campaignId) ?? null;

  layerStats.campaignLookups += 1;

  const row = await ctx.raw.campaign.findUnique({ where: { id: campaignId }, select: { baseSourceId: true, baseVersion: true, contentVersion: true } });

  const layer = row?.baseSourceId && row.baseVersion != null ? { sourceId: row.baseSourceId as string, version: row.baseVersion as number, contentVersion: (row.contentVersion as number) ?? 0 } : null;

  if (scope) scoped.set(scope, (memo ?? new Map()).set(campaignId, layer));
  else if (row && !row.baseSourceId) markPlainCampaign(campaignId);

  return layer;
}

function splitWhere(where: Row | undefined): { campaignId?: string; rest: Row } {
  const { campaignId, ...rest } = where ?? {};

  return { campaignId: typeof campaignId === "string" ? campaignId : undefined, rest };
}

function assertSupported(config: LayerConfig, args: Row, rest: Row) {
  for (const key of Object.keys(rest)) {
    if (key === "AND" || key === "OR" || key === "NOT") {
      if (JSON.stringify(rest[key]).includes("campaignId")) throw new Error(`LAYER_UNSUPPORTED_NESTED_CAMPAIGN_ID:${config.model}`);

      continue;
    }

    if (!config.baseFields.has(key)) throw new Error(`LAYER_UNSUPPORTED_FILTER:${config.model}.${key}`);
  }

  if (args.cursor || args.distinct) throw new Error(`LAYER_UNSUPPORTED_ARGS:${config.model}`);

  for (const [key, dir] of orderKeys(args.orderBy)) if (!config.baseFields.has(key) || (dir !== "asc" && dir !== "desc")) throw new Error(`LAYER_UNSUPPORTED_ORDER:${config.model}.${key}`);
}

const validAt = (layer: CampaignLayer) => ({ validFrom: { lte: layer.version }, OR: [{ validTo: null }, { validTo: { gt: layer.version } }] });

const toBaseWhere = (rest: Row, layer: CampaignLayer): Row => ({ AND: [rest, validAt(layer), { sourceCampaignId: layer.sourceId }] });

function asLocalShape(row: Row, campaignId: string | undefined): Row {
  const out: Row = {};

  for (const [key, value] of Object.entries(structuredClone(row))) if (!BASE_ONLY.has(key)) out[key] = value;

  return { ...out, campaignId, sourceId: row.id, sourceHash: null };
}

/** In a layered campaign an override row (sourceId set) is addressed by its base id; its own cuid never leaves the layer. */
const expose = (row: Row): Row => (row && row.sourceId != null ? { ...row, id: row.sourceId } : row);

/** Local-table filter for a public `id` condition: an override matches by `sourceId`, an ordinary local row by `id`. */
function publicIdFilter(cond: unknown, model: string): Row {
  const c = cond as Row;

  if (typeof cond === "string") return { OR: [{ id: cond }, { sourceId: cond }] };

  if (c && typeof c === "object") {
    const keys = Object.keys(c);

    if (keys.length === 1 && (keys[0] === "equals" || keys[0] === "in")) return { OR: [{ id: cond }, { sourceId: cond }] };

    if (keys.length === 1 && (keys[0] === "notIn" || (keys[0] === "not" && typeof c.not === "string"))) {
      const list = keys[0] === "notIn" ? c.notIn : [c.not];

      return { AND: [{ id: { notIn: list } }, { OR: [{ sourceId: null }, { sourceId: { notIn: list } }] }] };
    }
  }

  throw new Error(`LAYER_UNSUPPORTED_FILTER:${model}.id`);
}

function localWhere(config: LayerConfig, rest: Row, campaignId: string): Row {
  const { id, ...others } = rest;

  return id === undefined ? { ...rest, campaignId } : { campaignId, AND: [others, publicIdFilter(id, config.model)] };
}

/** The stored row (override or ordinary) that a public id refers to in this campaign. */
async function localByPublicId(ctx: Ctx, config: LayerConfig, campaignId: string, id: string): Promise<{ id: string } | null> {
  const rows: Array<{ id: string; sourceId: string | null }> = await local(ctx, config).findMany({ where: { campaignId, OR: [{ sourceId: id }, { id }] }, select: { id: true, sourceId: true } });

  return rows.find((r) => r.sourceId === id) ?? rows[0] ?? null;
}

/** Internal queries on the layered tables themselves (a tx client is also extended) must not re-enter the layer. */
const local = (ctx: Ctx, config: LayerConfig): Raw =>
  new Proxy({}, { get: (_t, op: string) => async (args: Row) => bypass.run(true, async () => ctx.raw[config.local][op](args)) });

async function overlayOf(ctx: Ctx, config: LayerConfig, campaignId: string, layer: CampaignLayer): Promise<Overlay> {
  const key = overlayKey(campaignId, layer, config.model);

  const cacheable = overlayCachingAllowed();

  const hit = cacheable ? overlayCache.get(key) : undefined;

  if (hit) return hit;

  const hidden: Array<{ id: string }> = await ctx.raw.campaignContentHide.findMany({ where: { campaignId, table: config.hideTable }, select: { id: true } });

  const shadowed: Array<{ sourceId: string }> = await local(ctx, config).findMany({ where: { campaignId, sourceId: { not: null } }, select: { sourceId: true } });

  const overlay = { hidden: new Set(hidden.map((r) => r.id)), shadowed: new Set(shadowed.map((r) => r.sourceId)) };

  if (cacheable) overlayCache.set(key, overlay);

  return overlay;
}

const SIGNATURE_MAX = 600;

/** `id: "x"` / `id: { in: [...] }` only: answered from the full cached table instead of a cache entry per id set. */
function idsOnly(rest: Row): string[] | null {
  const keys = Object.keys(rest);

  if (keys.length !== 1 || keys[0] !== "id") return null;

  const id = rest.id;

  if (typeof id === "string") return [id];

  if (id && typeof id === "object" && Object.keys(id).length === 1 && Array.isArray(id.in)) return id.in;

  return null;
}

/** Base rows visible at the campaign's version (before hides and overrides); shared across campaigns via the base cache. */
async function baseVisible(ctx: Ctx, config: LayerConfig, layer: CampaignLayer, rest: Row): Promise<Row[]> {
  const ids = idsOnly(rest);

  const signature = ids ? "*" : stableStringify(rest);

  const cacheable = signature.length <= SIGNATURE_MAX;

  if (!cacheable) return ctx.raw[config.base].findMany({ where: toBaseWhere(rest, layer) });

  const key = baseRowsKey(layer, config.model, signature);

  let rows = baseRowsCache.get(key) as Row[] | undefined;

  if (!rows) {
    rows = (await ctx.raw[config.base].findMany({ where: toBaseWhere(ids ? {} : rest, layer) })) as Row[];

    baseRowsCache.set(key, rows);
  }

  if (!ids) return rows;

  const wanted = new Set(ids);

  return rows.filter((r) => wanted.has(r.id));
}

interface Plan {
  rels: Record<string, Row>;
  foreign: string[];
  localArgs: Row;
  project: (rows: Row[]) => Row[];
}

/** Splits an `include`/`select` into what the local query can answer and the layered relations resolved afterwards. */
function planArgs(config: LayerConfig, args: Row, extraSelect: string[] = []): Plan {
  const rels: Record<string, Row> = {};

  const foreign: string[] = [];

  const others = otherRelationKeys(config.model);

  for (const source of [args.include, args.select] as Array<Row | undefined>) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (!value) continue;

      if (config.relations[key]) rels[key] = value === true ? {} : value;
      else if (others.has(key)) foreign.push(key);
    }
  }

  const strip = (obj: Row | undefined) => obj && Object.fromEntries(Object.entries(obj).filter(([k]) => !config.relations[k]));

  const include = strip(args.include);

  const foreignKeys = Object.keys(rels).filter((k) => config.relations[k].kind === "one").map((k) => config.relations[k].fk);

  const forced = Object.fromEntries([...extraSelect, "id", "sourceId", ...foreignKeys].map((k) => [k, true]));

  const select = args.select ? { ...strip(args.select), ...forced } : undefined;

  const localArgs = { ...args, include: include && Object.keys(include).length ? include : undefined, select };

  const project = (rows: Row[]) => (args.select ? rows.map((r) => Object.fromEntries(Object.entries(args.select as Row).filter(([, v]) => v).map(([k]) => [k, r[k]]))) : rows);

  return { rels, foreign, localArgs, project };
}

const targetArgs = (relArgs: Row, extra: string[]): { args: Row; drop: string[] } => {
  if (!relArgs.select) return { args: relArgs, drop: [] };

  const drop = extra.filter((k) => !relArgs.select[k]);

  return { args: { ...relArgs, select: { ...relArgs.select, ...Object.fromEntries(extra.map((k) => [k, true])) } }, drop };
};

async function resolveRelation(ctx: Ctx, rows: Row[], rel: Relation, key: string, relArgs: Row, campaignId: string) {
  const target = layeredModels()[rel.target];

  if (rel.kind === "one") {
    const ids = [...new Set(rows.map((r) => r[rel.fk]).filter(Boolean))] as string[];

    const { args, drop } = targetArgs(relArgs, ["id"]);

    const found: Row[] = ids.length ? await ctx.ext[target.local].findMany({ ...args, where: { ...args.where, campaignId, id: { in: ids } } }) : [];

    const byId = new Map(found.map((t) => [t.id, t]));

    for (const r of rows) {
      const hit = r[rel.fk] ? byId.get(r[rel.fk]) : undefined;

      r[key] = hit ? Object.fromEntries(Object.entries(hit).filter(([k]) => !drop.includes(k))) : null;
    }

    return;
  }

  const ids = rows.map((r) => r.id as string);

  const { take, skip, ...rest } = relArgs;

  const { args, drop } = targetArgs(rest, [rel.fk]);

  const found: Row[] = ids.length ? await ctx.ext[target.local].findMany({ ...args, where: { ...args.where, campaignId, [rel.fk]: { in: ids } } }) : [];

  const groups = new Map<string, Row[]>();

  for (const t of found) groups.set(t[rel.fk], [...(groups.get(t[rel.fk]) ?? []), Object.fromEntries(Object.entries(t).filter(([k]) => !drop.includes(k)))]);

  for (const r of rows) {
    const list = groups.get(r.id) ?? [];

    r[key] = skip || take != null ? list.slice(skip ?? 0, take != null ? (skip ?? 0) + take : undefined) : list;
  }
}

async function resolveRelations(ctx: Ctx, config: LayerConfig, rows: Row[], rels: Record<string, Row>, campaignId: string) {
  for (const [key, relArgs] of Object.entries(rels)) await resolveRelation(ctx, rows, config.relations[key], key, relArgs, campaignId);
}

/** A base row cannot be edited, so scalar references to a row the DM hid read as null (the former ON DELETE SET NULL). */
async function nullHiddenRefs(ctx: Ctx, config: LayerConfig, rows: Row[], campaignId: string, layer: CampaignLayer) {
  if (!rows.length) return;

  const hiddenOf = new Map<string, Set<string>>();

  for (const { target, fk, kind } of Object.values(config.relations)) {
    if (kind !== "one") continue;

    if (!hiddenOf.has(target)) hiddenOf.set(target, (await overlayOf(ctx, layeredModels()[target], campaignId, layer)).hidden);

    const hidden = hiddenOf.get(target)!;

    if (hidden.size) for (const r of rows) if (hidden.has(r[fk])) r[fk] = null;
  }
}

/** Layered rows for (model, campaign): local rows win over base rows by id; hidden base ids are dropped. */
async function layeredFindMany(ctx: Ctx, config: LayerConfig, args: Row, runLocal: Query, campaignId: string, rest: Row, layer: CampaignLayer): Promise<Row[]> {
  const { take, skip, orderBy } = args;

  const plan = planArgs(config, args, orderKeys(orderBy).map(([k]) => k));

  const locals: Row[] = (await runLocal({ ...plan.localArgs, where: localWhere(config, rest, campaignId), take: undefined, skip: undefined })).map(expose);

  const overlay = await overlayOf(ctx, config, campaignId, layer);

  const localIds = new Set(locals.map((r) => r.id));

  const bases = (await baseVisible(ctx, config, layer, rest)).filter((b) => !overlay.hidden.has(b.id) && !overlay.shadowed.has(b.id) && !localIds.has(b.id));

  const fromBase = new Set<Row>();

  const baseShaped = bases.map((b) => {
    const shaped = asLocalShape(b, campaignId);

    fromBase.add(shaped);

    return shaped;
  });

  await nullHiddenRefs(ctx, config, baseShaped, campaignId, layer);

  let merged = sortRows([...locals, ...baseShaped], orderBy);

  if (skip) merged = merged.slice(skip);

  if (take != null) merged = merged.slice(0, take);

  if (plan.foreign.length && merged.some((r) => fromBase.has(r))) throw new Error(`LAYER_UNSUPPORTED_INCLUDE:${config.model}.${plan.foreign.join(",")}`);

  await resolveRelations(ctx, config, merged, plan.rels, campaignId);

  return plan.project(merged);
}

async function layeredCount(ctx: Ctx, config: LayerConfig, campaignId: string, rest: Row, layer: CampaignLayer): Promise<number> {
  const locals: Row[] = (await local(ctx, config).findMany({ where: localWhere(config, rest, campaignId), select: { id: true, sourceId: true } })).map(expose);

  const overlay = await overlayOf(ctx, config, campaignId, layer);

  const localIds = new Set(locals.map((r) => r.id));

  const bases = (await baseVisible(ctx, config, layer, rest)).filter((b) => !overlay.hidden.has(b.id) && !overlay.shadowed.has(b.id) && !localIds.has(b.id));

  return locals.length + bases.length;
}

const AGGREGATES = ["_count", "_max", "_min", "_sum", "_avg"] as const;

async function layeredAggregate(ctx: Ctx, config: LayerConfig, args: Row, campaignId: string, rest: Row, layer: CampaignLayer) {
  const fields = new Set<string>();

  for (const op of AGGREGATES) if (args[op] && typeof args[op] === "object") for (const [k, v] of Object.entries(args[op])) if (v && k !== "_all") fields.add(k);

  const rows = await layeredFindMany(ctx, config, { select: Object.fromEntries([...fields, "id"].map((k) => [k, true])) }, (x) => local(ctx, config).findMany(x), campaignId, rest, layer);

  const values = (field: string) => rows.map((r) => r[field]).filter((v) => v != null) as number[];

  const out: Row = {};

  for (const op of AGGREGATES) {
    const spec = args[op];

    if (!spec) continue;

    if (op === "_count" && spec === true) {
      out._count = rows.length;

      continue;
    }

    out[op] = Object.fromEntries(
      Object.entries(spec as Row).filter(([, v]) => v).map(([field]) => {
        if (op === "_count") return [field, field === "_all" ? rows.length : values(field).length];

        const list = values(field);

        if (!list.length) return [field, null];

        if (op === "_max") return [field, list.reduce((a, b) => (b > a ? b : a))];

        if (op === "_min") return [field, list.reduce((a, b) => (b < a ? b : a))];

        const sum = list.reduce((a, b) => a + b, 0);

        return [field, op === "_sum" ? sum : sum / list.length];
      }),
    );
  }

  return out;
}

const notFound = () => new Prisma.PrismaClientKnownRequestError("No record found", { code: "P2025", clientVersion: Prisma.prismaVersion.client });

/** By-id reads without a campaign see stored rows only: a base row belongs to a template version and is never addressed without a campaign. */
async function readWithoutCampaign(operation: string, args: Row, query: Query) {
  if (!operation.endsWith("OrThrow")) return query(args);

  return query(args).catch((e: unknown) => {
    throw (e as { code?: string })?.code === "P2025" ? notFound() : e;
  });
}

async function read(ctx: Ctx, config: LayerConfig, operation: string, args: Row, query: Query) {
  const { campaignId, rest } = splitWhere(args.where);

  if (!campaignId) return readWithoutCampaign(operation, args, query);

  const layer = await campaignLayer(ctx, campaignId);

  if (!layer) return query(args);

  assertSupported(config, args, rest);

  if (operation === "count") return layeredCount(ctx, config, campaignId, rest, layer);

  if (operation === "aggregate") return layeredAggregate(ctx, config, args, campaignId, rest, layer);

  const many = operation === "findMany";

  const rows = await layeredFindMany(ctx, config, many ? args : { ...args, take: 1 }, many ? query : (x) => local(ctx, config).findMany(x), campaignId, rest, layer);

  if (many) return rows;

  if (!rows[0] && operation.endsWith("OrThrow")) throw notFound();

  return rows[0] ?? null;
}

/** Public ids among `ids` that already have a local row (an override, or an ordinary row carrying that id). */
async function localIdsAmong(ctx: Ctx, config: LayerConfig, campaignId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();

  const rows: Array<{ id: string; sourceId: string | null }> = await local(ctx, config).findMany({ where: { campaignId, OR: [{ sourceId: { in: ids } }, { id: { in: ids } }] }, select: { id: true, sourceId: true } });

  return new Set(rows.map((r) => r.sourceId ?? r.id));
}

async function materialize(ctx: Ctx, config: LayerConfig, campaignId: string, layer: CampaignLayer, where: Row) {
  const overlay = await overlayOf(ctx, config, campaignId, layer);

  const candidates = (await baseVisible(ctx, config, layer, where)).filter((b) => !overlay.hidden.has(b.id));

  const taken = await localIdsAmong(ctx, config, campaignId, candidates.map((b) => b.id));

  const bases = candidates.filter((b) => !taken.has(b.id));

  if (!bases.length) return;

  await local(ctx, config).createMany({ data: bases.map((b) => {
    const { id: _id, ...shaped } = asLocalShape(b, campaignId);

    return { ...shaped, sourceHash: contentRowHash(config.model, Object.fromEntries(config.hashColumns.filter((c) => c in b).map((c) => [c, b[c]]))) };
  }) });

  touch(campaignId);
}

async function hideBase(ctx: Ctx, config: LayerConfig, campaignId: string, ids: string[]) {
  if (!ids.length) return;

  await ctx.raw.campaignContentHide.createMany({ data: ids.map((id) => ({ campaignId, table: config.hideTable, id })), skipDuplicates: true });

  touch(campaignId);
}

async function removeMany(ctx: Ctx, config: LayerConfig, campaignId: string, layer: CampaignLayer, where: Row, args: Row, query: Query) {
  const overlay = await overlayOf(ctx, config, campaignId, layer);

  const matchingLocals: Array<{ id: string; sourceId: string | null }> = await local(ctx, config).findMany({ where: localWhere(config, where, campaignId), select: { id: true, sourceId: true } });

  const candidates = (await baseVisible(ctx, config, layer, where)).filter((b) => !overlay.hidden.has(b.id));

  const shadowed = await localIdsAmong(ctx, config, campaignId, candidates.map((b) => b.id));

  const baseOnly = candidates.filter((b) => !shadowed.has(b.id)).map((b) => b.id);

  const overridden = matchingLocals.flatMap((r) => (r.sourceId ? [r.sourceId] : []));

  await hideBase(ctx, config, campaignId, [...new Set([...baseOnly, ...overridden])]);

  const result = (await query({ ...args, where: localWhere(config, where, campaignId) })) as { count: number };

  return { count: result.count + baseOnly.length };
}

async function withRelations(ctx: Ctx, config: LayerConfig, args: Row, campaignId: string, query: Query) {
  const plan = planArgs(config, args);

  const found = await query({ ...args, include: plan.localArgs.include, select: plan.localArgs.select });

  if (!found) return found;

  const row = expose(found);

  await resolveRelations(ctx, config, [row], plan.rels, campaignId);

  return plan.project([row])[0];
}

async function onWrite(ctx: Ctx, config: LayerConfig, operation: string, args: Row, query: Query) {
  const { campaignId: whereCampaign, rest } = splitWhere(args.where);

  const campaignId = whereCampaign ?? currentContentWrite()?.campaignId;

  if (!campaignId) return query(args);

  const layer = await campaignLayer(ctx, campaignId);

  if (!layer) return query(args);

  assertSupported(config, args, rest);

  if (operation === "deleteMany") return removeMany(ctx, config, campaignId, layer, rest, args, query);

  if (operation === "delete") {
    const [base] = await baseVisible(ctx, config, layer, { id: rest.id });

    if (base) await hideBase(ctx, config, campaignId, [base.id]);

    const localRow = await localByPublicId(ctx, config, campaignId, rest.id as string);

    if (localRow) return withRelations(ctx, config, { ...args, where: { ...args.where, id: localRow.id } }, campaignId, query);

    if (base) {
      const shaped = asLocalShape(base, campaignId);

      await resolveRelations(ctx, config, [shaped], planArgs(config, args).rels, campaignId);

      return shaped;
    }

    return query(args);
  }

  await materialize(ctx, config, campaignId, layer, rest);

  if (operation === "updateMany") return query({ ...args, where: localWhere(config, rest, campaignId) });

  const target = typeof rest.id === "string" ? await localByPublicId(ctx, config, campaignId, rest.id) : null;

  return withRelations(ctx, config, target ? { ...args, where: { ...args.where, id: target.id } } : args, campaignId, query);
}

const stringOf = (v: unknown) => (typeof v === "string" ? v : undefined);

/** The campaign a create/createMany writes for: always taken from the data, never from the ambient write context. */
function createdFor(args: Row): string | undefined {
  const rows: Row[] = Array.isArray(args.data) ? args.data : [args.data];

  const found = new Set(rows.map((d) => stringOf(d?.campaignId) ?? stringOf(d?.campaign?.connect?.id)));

  if (found.size > 1) throw new Error("LAYER_MIXED_CAMPAIGNS");

  return [...found][0];
}

async function onOther(ctx: Ctx, config: LayerConfig, operation: string, args: Row, query: Query) {
  const creating = operation === "create" || operation === "createMany";

  const campaignId = creating ? createdFor(args) : stringOf(args.data?.campaignId) ?? stringOf(args.where?.campaignId) ?? stringOf(args.create?.campaignId) ?? currentContentWrite()?.campaignId;

  const layer = campaignId ? await campaignLayer(ctx, campaignId) : null;

  if (!campaignId || !layer) return query(args);

  if (UNSUPPORTED_OPS.has(operation)) throw new Error(`LAYER_UNSUPPORTED_OPERATION:${config.model}.${operation}`);

  if (creating) {
    const given = (operation === "create" ? [args.data] : Array.isArray(args.data) ? args.data : [args.data]).flatMap((d: Row) => (typeof d?.id === "string" ? [d.id] : []));

    if (given.length && (await baseVisible(ctx, config, layer, { id: { in: given } })).length) throw new Error(`LAYER_ID_COLLISION:${config.model}`);

    touch(campaignId);

    return operation === "create" ? withRelations(ctx, config, args, campaignId, query) : query(args);
  }

  return query(args);
}

/** `campaign.spells`, `campaign.races`, ... must see base rows: resolved through the layer instead of the native join. */
async function readCampaign(ctx: Ctx, operation: string, args: Row, query: Query) {
  const hosts = campaignRelations();

  const rels: Record<string, Row> = {};

  for (const source of [args.include, args.select] as Array<Row | undefined>) for (const [key, value] of Object.entries(source ?? {})) if (value && hosts[key]) rels[key] = value === true ? {} : value;

  if (!Object.keys(rels).length) return query(args);

  const id = typeof args.where?.id === "string" ? args.where.id : undefined;

  if (id && !(await campaignLayer(ctx, id))) return query(args);

  const strip = (obj: Row | undefined) => obj && Object.fromEntries(Object.entries(obj).filter(([k]) => !hosts[k]));

  const include = strip(args.include);

  const select = args.select ? { ...strip(args.select), id: true } : undefined;

  const found = await query({ ...args, include: include && Object.keys(include).length ? include : undefined, select });

  const rows: Row[] = Array.isArray(found) ? found : found ? [found] : [];

  for (const row of rows) {
    for (const [key, relArgs] of Object.entries(rels)) row[key] = await ctx.ext[hosts[key].local].findMany({ ...relArgs, where: { ...relArgs.where, campaignId: row.id } });
  }

  if (!args.select) return found;

  const project = (r: Row) => Object.fromEntries(Object.entries(args.select as Row).filter(([, v]) => v).map(([k]) => [k, r[k]]));

  return Array.isArray(found) ? rows.map(project) : found ? project(found) : found;
}

export function contentLayer() {
  return Prisma.defineExtension((client) => {
    const raw = client as unknown as Raw;

    let extended: Raw = raw;

    const ctx: Ctx = {
      get raw() { return txOrWrite() ?? raw; },
      get ext() { return txOrWrite() ?? extended; },
    };

    const result = client.$extends({
      name: "content-layer",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const run = query as Query;

            const a = args as Row;

            if (model === "Campaign") {
              if (READS.has(operation) && operation.startsWith("find")) return readCampaign(ctx, operation, a, run);

              if (!CAMPAIGN_WRITES.has(operation)) return run(a);

              if (operation === "create" || operation === "createMany") return run(a);

              const value = await run(a);

              const id = (a.where as Row | undefined)?.id;

              invalidateCampaignLayer(typeof id === "string" ? id : undefined);

              forgetScoped(typeof id === "string" ? id : undefined);

              afterContentCommit(() => invalidateCampaignLayer(typeof id === "string" ? id : undefined));

              return value;
            }

            if (!isLayered(model) || bypass.getStore()) return run(a);

            const config = layeredModels()[model];

            if (WRITES.has(operation)) return onWrite(ctx, config, operation, a, run);

            if (READS.has(operation)) return read(ctx, config, operation, a, run);

            return onOther(ctx, config, operation, a, run);
          },
        },
      },
    });

    extended = result as unknown as Raw;

    return result;
  });
}

export type ContentLayerClient = PrismaClient;
