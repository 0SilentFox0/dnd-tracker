import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "../types";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { handoffId } from "@/lib/schemas/assistant-handoff";
import { jsonContent } from "@/lib/server/assistant/json";
import { kindTable } from "@/lib/server/compendium-import/repository";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";
import { pageOf } from "@/lib/utils/api/page-of";

export const COMPENDIUM_NEED: ActorNeed = {
  access: "dm",
  scope: "content:write",
  sessionOnly: true,
};

const windowSchema = z.strictObject({
  offset: z.number().int().min(0).max(100_000).default(0),
  limit: z.number().int().min(1).max(20).default(20),
});

const importKind = z.enum(
  Object.keys(kindTable) as Array<keyof typeof kindTable>
);

export const COMPENDIUM_READ_INPUTS = {
  "note-options": windowSchema,
  reports: windowSchema.extend({ runId: handoffId.optional() }),
  options: windowSchema.extend({ kind: importKind.default("spells") }),
  entries: windowSchema.extend({ kind: importKind, targetId: handoffId }),
  notes: z.strictObject({
    selectedKeys: z
      .array(z.string().min(1).max(512))
      .min(1)
      .max(5)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
};

export type CompendiumRead = keyof typeof COMPENDIUM_READ_INPUTS;

function safeText(value: unknown, max = 200): string {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s<>]+/gi, (url) => {
      try {
        const parsed = new URL(url);

        return parsed.search ||
          parsed.hash ||
          parsed.username ||
          parsed.password
          ? "[private link in the app]"
          : url;
      } catch {
        return "[link in the app]";
      }
    })
    .replace(/\bBearer\s+\S+|\bsk-[A-Za-z0-9_-]{8,}/gi, "[redacted]")
    .slice(0, max);
}

const result = (data: Record<string, unknown>): ActionResult => ({
  data: jsonContent(data),
  affected: [],
  warnings: [],
});

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;

type Window = z.infer<typeof windowSchema>;

interface RunRow {
  id: string;
  createdAt: Date;
  counts: Record<string, unknown> | null;
  readyToImport: unknown;
  readyToPlay: unknown;
}

type ReadHandler = (actor: Actor, input: never) => Promise<ActionResult>;

async function readNoteOptions(actor: Actor, { offset, limit }: Window) {
  const rows = await prisma.compendiumEntry.findMany({ where: { campaignId: actor.campaignId }, select: { canonicalKey: true, originalName: true }, orderBy: { canonicalKey: "asc" }, skip: offset, take: limit + 1 });

  const page = pageOf(rows, offset, limit);

  return result({ items: page.items.map(row => ({ canonicalKey: row.canonicalKey, title: safeText(row.originalName) })), nextOffset: page.nextOffset });
}

async function readNotes(actor: Actor, { selectedKeys }: z.infer<typeof COMPENDIUM_READ_INPUTS.notes>) {
  const rows = await prisma.compendiumEntry.findMany({
    where: { campaignId: actor.campaignId, canonicalKey: { in: selectedKeys } },
    take: 5,
    select: { canonicalKey: true, originalName: true, edition: true, notes: true },
  });

  if (rows.length !== selectedKeys.length || rows.some((r) => !selectedKeys.includes(r.canonicalKey)))
    throw new ContentError(API_ERRORS.ASSISTANT_NOTE_NOT_FOUND, 404);

  return result({
    entries: rows.map((r) => ({
      canonicalKey: safeText(r.canonicalKey, 512),
      originalName: safeText(r.originalName),
      edition: safeText(r.edition, 20),
      notes: /^[\s]*[\[{]/.test(r.notes) ? "Structured notes: view them in the app." : safeText(r.notes, 3000),
    })),
    explicitlySelected: true,
  });
}

async function readReports(actor: Actor, { offset, limit, runId }: z.infer<typeof COMPENDIUM_READ_INPUTS.reports>) {
  const byRun = runId ? Prisma.sql`AND id = ${runId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<RunRow[]>`
    SELECT id, "createdAt", report->'counts' AS counts, report->'readyToImport' AS "readyToImport", report->'readyToPlay' AS "readyToPlay"
    FROM compendium_import_runs
    WHERE "campaignId" = ${actor.campaignId} ${byRun}
    ORDER BY "createdAt" DESC, id DESC
    OFFSET ${offset} LIMIT ${limit + 1}`;

  const page = pageOf(rows, offset, limit);

  return result({
    runs: page.items.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      counts: { created: count(row.counts?.created), updated: count(row.counts?.updated), unchanged: count(row.counts?.unchanged), errors: count(row.counts?.errors) },
      readyToImport: row.readyToImport === true,
      readyToPlay: row.readyToPlay === true,
    })),
    hasMore: page.hasMore,
  });
}

async function readEntries(actor: Actor, { offset, limit, kind, targetId }: z.infer<typeof COMPENDIUM_READ_INPUTS.entries>) {
  const rows = await prisma.compendiumEntry.findMany({
    where: { campaignId: actor.campaignId, kind, localId: targetId },
    skip: offset,
    take: limit + 1,
    orderBy: { canonicalKey: "asc" },
    select: { canonicalKey: true, originalName: true, edition: true },
  });

  const page = pageOf(rows, offset, limit);

  return result({
    entries: page.items.map((r) => ({ canonicalKey: safeText(r.canonicalKey, 512), originalName: safeText(r.originalName), edition: safeText(r.edition, 20) })),
    hasMore: page.hasMore,
    notesRequireSelection: true,
  });
}

async function readOptions(actor: Actor, { offset, limit, kind }: z.infer<typeof COMPENDIUM_READ_INPUTS.options>) {
  const table = BUNDLE_TABLES.find((t) => t.key === kindTable[kind]);

  if (!table) throw new ContentError(API_ERRORS.ASSISTANT_CONTENT_KIND_UNAVAILABLE, 400);

  const rows = await delegateOf(prisma, table).findMany({ where: { campaignId: actor.campaignId }, skip: offset, take: limit + 1, orderBy: { id: "asc" }, select: { id: true, name: true } });

  const page = pageOf(rows, offset, limit);

  return result({ local: page.items.map((r) => ({ id: String(r.id), name: safeText(r.name), kind })), hasMore: page.hasMore });
}

const READ_HANDLERS: Record<CompendiumRead, ReadHandler> = {
  "note-options": readNoteOptions as ReadHandler,
  reports: readReports as ReadHandler,
  options: readOptions as ReadHandler,
  entries: readEntries as ReadHandler,
  notes: readNotes as ReadHandler,
};

async function authorizeDm(actor: Actor) {
  const found = await prisma.campaign.findFirst({ where: { id: actor.campaignId, members: { some: { userId: actor.userId, role: "dm" } } }, select: { id: true } });

  if (!found) throw new ContentError(API_ERRORS.ASSISTANT_CAMPAIGN_DM_ONLY, 403);
}

/** Session-only bounded projections. No importer, raw JSON, credentials or provider calls. */
export async function readCompendiumSummary(actor: Actor, operation: CompendiumRead, raw: unknown): Promise<ActionResult> {
  assertCan(actor, COMPENDIUM_NEED);

  const input = parseInput(COMPENDIUM_READ_INPUTS[operation] as z.ZodType, raw);

  await authorizeDm(actor);

  return (READ_HANDLERS[operation] as (actor: Actor, input: unknown) => Promise<ActionResult>)(actor, input);
}
