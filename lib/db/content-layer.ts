import { Prisma, type PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

import { currentContentWrite } from "@/lib/server/content/write-context";
import { hashJson } from "@/lib/utils/battle/store/stable-json";

type Model = "Spell" | "SpellGroup";

interface LayerConfig {
  base: "spellBase" | "spellGroupBase";
  local: "spell" | "spellGroup";
  hideTable: string;
  relations: Record<string, { fk: string; target: Model }>;
}

export const LAYERED_MODELS: Record<Model, LayerConfig> = {
  Spell: { base: "spellBase", local: "spell", hideTable: "spells", relations: { spellGroup: { fk: "groupId", target: "SpellGroup" } } },
  SpellGroup: { base: "spellGroupBase", local: "spellGroup", hideTable: "spell_groups", relations: {} },
};

const BASE_ONLY = new Set(["sourceCampaignId", "validFrom", "validTo"]);

const READS = new Set(["findMany", "findFirst", "findUnique", "count"]);

const WRITES = new Set(["update", "updateMany", "delete", "deleteMany"]);

type Row = Record<string, any>;

type Raw = Record<string, any>;

interface CampaignLayer { sourceId: string; version: number }

const LAYER_TTL_MS = 30_000;

const layerCache = new Map<string, { at: number; layer: CampaignLayer | null }>();

export const invalidateCampaignLayer = (campaignId?: string) => (campaignId ? layerCache.delete(campaignId) : layerCache.clear());

export const layerStats = { campaignLookups: 0 };

const baseFields = (model: Model) => new Set(Prisma.dmmf.datamodel.models.find((m) => m.name === `${model}Base`)?.fields.map((f) => f.name));

async function campaignLayer(raw: Raw, campaignId: string): Promise<CampaignLayer | null> {
  const hit = layerCache.get(campaignId);

  if (hit && Date.now() - hit.at < LAYER_TTL_MS) return hit.layer;

  layerStats.campaignLookups += 1;

  const row = await raw.campaign.findUnique({ where: { id: campaignId }, select: { baseSourceId: true, baseVersion: true } });

  const layer = row?.baseSourceId && row.baseVersion != null ? { sourceId: row.baseSourceId as string, version: row.baseVersion as number } : null;

  layerCache.set(campaignId, { at: Date.now(), layer });

  return layer;
}

function splitWhere(where: Row | undefined): { campaignId?: string; rest: Row } {
  const { campaignId, ...rest } = where ?? {};

  return { campaignId: typeof campaignId === "string" ? campaignId : undefined, rest };
}

function assertSupported(model: Model, where: Row) {
  const fields = baseFields(model);

  for (const key of Object.keys(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") {
      if (JSON.stringify(where[key]).includes("campaignId")) throw new Error(`LAYER_UNSUPPORTED_NESTED_CAMPAIGN_ID:${model}`);

      continue;
    }

    if (!fields.has(key)) throw new Error(`LAYER_UNSUPPORTED_FILTER:${model}.${key}`);
  }
}

const validAt = (layer: CampaignLayer) => ({ validFrom: { lte: layer.version }, OR: [{ validTo: null }, { validTo: { gt: layer.version } }] });

async function hiddenIds(raw: Raw, config: LayerConfig, campaignId: string): Promise<string[]> {
  const rows = await raw.campaignContentHide.findMany({ where: { campaignId, table: config.hideTable }, select: { id: true } });

  return rows.map((r: { id: string }) => r.id);
}

function toBaseWhere(rest: Row, layer: CampaignLayer, excludeIds: string[]): Row {
  return { AND: [rest, validAt(layer), { sourceCampaignId: layer.sourceId }, ...(excludeIds.length ? [{ id: { notIn: excludeIds } }] : [])] };
}

function asLocalShape(row: Row, campaignId: string): Row {
  const out: Row = {};

  for (const [key, value] of Object.entries(row)) if (!BASE_ONLY.has(key)) out[key] = value;

  return { ...out, campaignId, sourceId: row.id, sourceHash: null };
}

const orderKeys = (orderBy: unknown): Array<[string, "asc" | "desc"]> =>
  (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []).flatMap((o: Row) => Object.entries(o).map(([k, v]) => [k, v as "asc" | "desc"] as [string, "asc" | "desc"]));

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;

  if (a == null) return 1;

  if (b == null) return -1;

  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;

  return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const keys = orderKeys(orderBy);

  if (!keys.length) return rows;

  return [...rows].sort((x, y) => {
    for (const [key, dir] of keys) {
      const c = compare(x[key], y[key]);

      if (c !== 0) return dir === "desc" ? -c : c;
    }

    return 0;
  });
}

const pickKeys = (row: Row, select: Row) => Object.fromEntries(Object.entries(select).filter(([, v]) => v).map(([k]) => [k, row[k]]));

interface Ctx { raw: Raw; ext: Raw }

const bypass = new AsyncLocalStorage<true>();

/** Internal queries on the layered tables themselves (a tx client is also extended) must not re-enter the layer. */
const local = (ctx: Ctx, config: LayerConfig): Raw =>
  new Proxy({}, { get: (_t, op: string) => async (args: Row) => bypass.run(true, async () => ctx.raw[config.local][op](args)) });

/** Layered rows for (model, campaign): local rows win over base rows by id; hidden base ids are dropped. */
async function layeredFindMany(ctx: Ctx, model: Model, args: Row, query: (a: Row) => Promise<Row[]>, campaignId: string, rest: Row, layer: CampaignLayer): Promise<Row[]> {
  const config = LAYERED_MODELS[model];

  const { take, skip, orderBy, include, select } = args;

  const relationKeys = Object.keys(include ?? {}).filter((k) => config.relations[k]);

  const localInclude = include && Object.fromEntries(Object.entries(include).filter(([k]) => !config.relations[k]));

  const forced = select ? { ...select, id: true, ...Object.fromEntries(orderKeys(orderBy).map(([k]) => [k, true])), ...Object.fromEntries(relationKeys.map((k) => [config.relations[k].fk, true])) } : undefined;

  const localArgs: Row = { ...args, where: { ...rest, campaignId }, take: undefined, skip: undefined, include: localInclude && Object.keys(localInclude).length ? localInclude : undefined, select: forced };

  const locals = await query(localArgs);

  const hidden = await hiddenIds(ctx.raw, config, campaignId);

  const bases = await ctx.raw[config.base].findMany({ where: toBaseWhere(rest, layer, [...locals.map((r) => r.id), ...hidden]), ...(orderBy ? { orderBy } : {}) });

  if (bases.length && localInclude && Object.keys(localInclude).length) throw new Error(`LAYER_UNSUPPORTED_INCLUDE:${model}`);

  let merged: Row[] = [...locals, ...bases.map((b: Row) => asLocalShape(b, campaignId))];

  merged = sortRows(merged, orderBy);

  if (skip) merged = merged.slice(skip);

  if (take != null) merged = merged.slice(0, take);

  for (const key of relationKeys) await resolveRelation(ctx, merged, config.relations[key], key, include[key], campaignId);

  return select ? merged.map((r) => ({ ...pickKeys(r, select), ...Object.fromEntries(relationKeys.map((k) => [k, r[k]])) })) : merged;
}

async function resolveRelation(ctx: Ctx, rows: Row[], rel: { fk: string; target: Model }, key: string, relArgs: unknown, campaignId: string) {
  const ids = [...new Set(rows.map((r) => r[rel.fk]).filter(Boolean))] as string[];

  const targets = ids.length ? await ctx.ext[LAYERED_MODELS[rel.target].local].findMany({ where: { campaignId, id: { in: ids } }, ...(typeof relArgs === "object" ? (relArgs as Row) : {}) }) : [];

  const byId = new Map(targets.map((t: Row) => [t.id, t]));

  for (const r of rows) r[key] = r[rel.fk] ? (byId.get(r[rel.fk]) ?? null) : null;
}

async function baseRowAt(ctx: Ctx, config: LayerConfig, layer: CampaignLayer, id: string): Promise<Row | null> {
  return ctx.raw[config.base].findFirst({ where: toBaseWhere({ id }, layer, []) });
}

/** Content writes run in a write context; the materialised copy must join its transaction. */
function writeDb(raw: Raw): Raw {
  return (currentContentWrite()?.db as Raw | undefined) ?? raw;
}

async function materialize(ctx: Ctx, model: Model, campaignId: string, layer: CampaignLayer, where: Row) {
  const config = LAYERED_MODELS[model];

  const db = writeDb(ctx.raw);

  const locals = await local(ctx, config).findMany({ where: { ...where, campaignId }, select: { id: true } });

  const hidden = await hiddenIds(db, config, campaignId);

  const bases: Row[] = await ctx.raw[config.base].findMany({ where: toBaseWhere(where, layer, [...locals.map((r: Row) => r.id), ...hidden]) });

  if (!bases.length) return [];

  await local(ctx, config).createMany({ data: bases.map((b) => ({ ...asLocalShape(b, campaignId), sourceHash: hashJson(b) })) });

  return bases.map((b) => b.id as string);
}

async function onWrite(ctx: Ctx, model: Model, operation: string, args: Row, query: (a: Row) => Promise<unknown>) {
  const config = LAYERED_MODELS[model];

  const { campaignId: whereCampaign, rest } = splitWhere(args.where);

  const campaignId = whereCampaign ?? currentContentWrite()?.campaignId;

  if (!campaignId) return query(args);

  const layer = await campaignLayer(ctx.raw, campaignId);

  if (!layer) return query(args);

  assertSupported(model, rest);

  if (operation === "deleteMany") {
    const hidden = await materializeHides(ctx, config, campaignId, layer, rest);

    const result = (await query(args)) as { count: number };

    return { count: result.count + hidden };
  }

  if (operation === "delete") {
    const base = await baseRowAt(ctx, config, layer, rest.id as string);

    if (base) await writeDb(ctx.raw).campaignContentHide.createMany({ data: [{ campaignId, table: config.hideTable, id: base.id }], skipDuplicates: true });

    const localRow = await local(ctx, config).findFirst({ where: { id: rest.id, campaignId }, select: { id: true } });

    if (localRow) return query(args);

    if (base) return asLocalShape(base, campaignId);

    return query(args);
  }

  await materialize(ctx, model, campaignId, layer, rest);

  return query(args);
}

async function materializeHides(ctx: Ctx, config: LayerConfig, campaignId: string, layer: CampaignLayer, where: Row): Promise<number> {
  const db = writeDb(ctx.raw);

  const hidden = await hiddenIds(db, config, campaignId);

  const bases: Row[] = await ctx.raw[config.base].findMany({ where: toBaseWhere(where, layer, hidden), select: { id: true } });

  if (bases.length) await db.campaignContentHide.createMany({ data: bases.map((b) => ({ campaignId, table: config.hideTable, id: b.id })), skipDuplicates: true });

  const localMatches = await local(ctx, config).findMany({ where: { ...where, campaignId }, select: { id: true } });

  const localIds = new Set(localMatches.map((r: Row) => r.id));

  return bases.filter((b) => !localIds.has(b.id)).length;
}

export function contentLayer() {
  return Prisma.defineExtension((client) => {
    const raw = client as unknown as Raw;

    const ctx: Ctx = { get raw() { return (currentContentWrite()?.db as Raw | undefined) ?? raw; }, ext: raw };

    const extended = client.$extends({
      name: "content-layer",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!(model in LAYERED_MODELS) || bypass.getStore()) return query(args);

            const layered = model as Model;

            const a = args as Row;

            if (WRITES.has(operation)) return onWrite(ctx, layered, operation, a, query as (x: Row) => Promise<unknown>);

            if (!READS.has(operation)) return query(args);

            const { campaignId, rest } = splitWhere(a.where);

            if (!campaignId) return readWithoutCampaign(ctx, layered, operation, a, query as (x: Row) => Promise<unknown>);

            const layer = await campaignLayer(raw, campaignId);

            if (!layer) return query(args);

            assertSupported(layered, rest);

            const run = (x: Row) => (query as (y: Row) => Promise<Row[]>)(x);

            const localMany = (x: Row) => local(ctx, LAYERED_MODELS[layered]).findMany(x) as Promise<Row[]>;

            if (operation === "count") return layeredCount(ctx, layered, campaignId, rest, layer);

            const rows = await layeredFindMany(ctx, layered, { ...a, take: operation === "findMany" ? a.take : 1 }, operation === "findMany" ? run : localMany, campaignId, rest, layer);

            return operation === "findMany" ? rows : (rows[0] ?? null);
          },
        },
      },
    });

    ctx.ext = extended as unknown as Raw;

    return extended;
  });
}

async function layeredCount(ctx: Ctx, model: Model, campaignId: string, rest: Row, layer: CampaignLayer): Promise<number> {
  const config = LAYERED_MODELS[model];

  const locals: Row[] = await local(ctx, config).findMany({ where: { ...rest, campaignId }, select: { id: true } });

  const hidden = await hiddenIds(ctx.raw, config, campaignId);

  const baseCount: number = await ctx.raw[config.base].count({ where: toBaseWhere(rest, layer, [...locals.map((r) => r.id), ...hidden]) });

  return locals.length + baseCount;
}

/** By-id reads without a campaign: local row first, then the newest open base row. Carries no `campaignId`. */
async function readWithoutCampaign(ctx: Ctx, model: Model, operation: string, args: Row, query: (a: Row) => Promise<unknown>) {
  const found = await query(args);

  const id = (args.where as Row | undefined)?.id;

  if (found || typeof id !== "string" || operation === "findMany" || operation === "count") return found;

  const config = LAYERED_MODELS[model];

  const base = await ctx.raw[config.base].findFirst({ where: { id, validTo: null } });

  return base ? asLocalShape(base, undefined as unknown as string) : null;
}

export type ContentLayerClient = PrismaClient;
