import { z } from "zod";

import type { ActionResult } from "../types";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { handoffId } from "@/lib/schemas/assistant-handoff";
import { jsonContent } from "@/lib/server/assistant/json";
import { kindTable, prismaImportRepository } from "@/lib/server/compendium-import/repository";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";
import { isDmMember } from "@/lib/utils/api/is-dm";

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
          ? "[Приватне посилання у застосунку]"
          : url;
      } catch {
        return "[Посилання у застосунку]";
      }
    })
    .replace(/\bBearer\s+\S+|\bsk-[A-Za-z0-9_-]{8,}/gi, "[Приховано]")
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

/** Session-only bounded projections. No importer, raw JSON, credentials or provider calls. */
export async function readCompendiumSummary(
  actor: Actor,
  operation: CompendiumRead,
  raw: unknown
): Promise<ActionResult> {
  assertCan(actor, COMPENDIUM_NEED);

  const input = parseInput(COMPENDIUM_READ_INPUTS[operation] as z.ZodType, raw);

  const members = await prisma.campaignMember.findMany({ where: { campaignId: actor.campaignId, userId: actor.userId }, select: { role: true } });

  if (!isDmMember(members)) throw new ContentError(API_ERRORS.ASSISTANT_CAMPAIGN_DM_ONLY, 403);

  await prismaImportRepository.authorize(actor);

  if (operation === "note-options") {
    const { offset, limit } = input as z.infer<typeof windowSchema>;

    const rows = await prisma.compendiumEntry.findMany({ where: { campaignId: actor.campaignId }, select: { canonicalKey: true, originalName: true }, orderBy: { canonicalKey: "asc" }, skip: offset, take: limit + 1 });

    return result({ items: rows.slice(0, limit).map(row => ({ canonicalKey: row.canonicalKey, title: safeText(row.originalName) })), nextOffset: rows.length > limit ? offset + limit : null });
  }

  if (operation === "notes") {
    const { selectedKeys } = input as z.infer<
      typeof COMPENDIUM_READ_INPUTS.notes
    >;

    const rows = await prisma.compendiumEntry.findMany({
      where: {
        campaignId: actor.campaignId,
        canonicalKey: { in: selectedKeys },
      },
      take: 5,
      select: {
        canonicalKey: true,
        originalName: true,
        edition: true,
        notes: true,
      },
    });

    if (
      rows.length !== selectedKeys.length ||
      rows.some((r) => !selectedKeys.includes(r.canonicalKey))
    )
      throw new ContentError(API_ERRORS.ASSISTANT_NOTE_NOT_FOUND, 404);

    return result({
      entries: rows.map((r) => ({
        canonicalKey: safeText(r.canonicalKey, 512),
        originalName: safeText(r.originalName),
        edition: safeText(r.edition, 20),
        notes: /^[\s]*[\[{]/.test(r.notes)
          ? "Структуровані примітки перегляньте у застосунку."
          : safeText(r.notes, 3000),
      })),
      explicitlySelected: true,
    });
  }

  const value = input as z.infer<typeof COMPENDIUM_READ_INPUTS.entries> & {
    runId?: string;
  };

  const { offset, limit } = value;

  if (operation === "reports") {
    const rows = await prisma.compendiumImportRun.findMany({
      where: {
        campaignId: actor.campaignId,
        ...(value.runId && { id: value.runId }),
      },
      skip: offset,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, createdAt: true, report: true },
    });

    return result({
      runs: rows.slice(0, limit).map((row) => {
        const report = row.report as Record<string, unknown>;

        const counts = report?.counts as Record<string, unknown> | undefined;

        return {
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          counts: {
            created: count(counts?.created),
            updated: count(counts?.updated),
            unchanged: count(counts?.unchanged),
            errors: count(counts?.errors),
          },
          readyToImport: report?.readyToImport === true,
          readyToPlay: report?.readyToPlay === true,
        };
      }),
      hasMore: rows.length > limit,
    });
  }

  if (operation === "entries") {
    const rows = await prisma.compendiumEntry.findMany({
      where: {
        campaignId: actor.campaignId,
        kind: value.kind,
        localId: value.targetId,
      },
      skip: offset,
      take: limit + 1,
      orderBy: { canonicalKey: "asc" },
      select: { canonicalKey: true, originalName: true, edition: true },
    });

    return result({
      entries: rows
        .slice(0, limit)
        .map((r) => ({
          canonicalKey: safeText(r.canonicalKey, 512),
          originalName: safeText(r.originalName),
          edition: safeText(r.edition, 20),
        })),
      hasMore: rows.length > limit,
      notesRequireSelection: true,
    });
  }

  const table = BUNDLE_TABLES.find((t) => t.key === kindTable[value.kind]);

  if (!table) throw new ContentError(API_ERRORS.ASSISTANT_CONTENT_KIND_UNAVAILABLE, 400);

  const rows = await delegateOf(prisma, table).findMany({
    where: { campaignId: actor.campaignId },
    skip: offset,
    take: limit + 1,
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

  return result({
    local: rows
      .slice(0, limit)
      .map((r) => ({
        id: String(r.id),
        name: safeText(r.name),
        kind: value.kind,
      })),
    hasMore: rows.length > limit,
  });
}
