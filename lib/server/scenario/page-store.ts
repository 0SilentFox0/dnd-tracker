import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { emptyContent } from "@/lib/utils/scenario/structure";
import type { ScenarioContent, ScenarioPage, ScenarioPageKind, ScenarioPageStatus, ScenarioPageSummary } from "@/types/scenario";

export const SUMMARY_SELECT = { id: true, kind: true, arc: true, title: true, subtitle: true, status: true, sortOrder: true, characterId: true, version: true, updatedAt: true } as const;

type SummaryRow = Prisma.ScenarioPageGetPayload<{ select: typeof SUMMARY_SELECT }>;

export class InvalidScenarioContentError extends Error {
  constructor() {
    super(API_ERRORS.SCENARIO_CONTENT_INVALID);
  }
}

export const OWNED_SELECT = { id: true, campaignId: true, version: true, title: true } as const;

export const OWNED_WITH_CONTENT_SELECT = { ...SUMMARY_SELECT, campaignId: true, content: true } as const;

function parseContent(json: unknown): ScenarioContent | null {
  const parsed = scenarioContentSchema.safeParse(json);

  return parsed.success ? parsed.data : null;
}

export const readContent = (json: unknown): ScenarioContent => parseContent(json) ?? emptyContent();

export function readContentStrict(json: unknown): ScenarioContent {
  const content = parseContent(json);

  if (!content) throw new InvalidScenarioContentError();

  return content;
}

// rows may carry content/searchText; they must not leak into summaries (egress)
export function toSummary(row: SummaryRow): ScenarioPageSummary {
  const { id, kind, arc, title, subtitle, status, sortOrder, characterId, version, updatedAt } = row;

  return { id, kind: kind as ScenarioPageKind, arc, title, subtitle, status: status as ScenarioPageStatus, sortOrder, characterId, version, updatedAt: updatedAt.toISOString() };
}

export function toPage(row: SummaryRow & { content: unknown }): ScenarioPage {
  return { ...toSummary(row), content: readContentStrict(row.content) };
}

export async function listPages(campaignId: string): Promise<ScenarioPageSummary[]> {
  const rows = await prisma.scenarioPage.findMany({ where: { campaignId }, select: SUMMARY_SELECT, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });

  return rows.map(toSummary);
}

// only played section ids leave the DB — scene pages are large and these lookups run on every sheet / hero page view
export async function loadPlayedSections(campaignId: string, pageIds: string[]): Promise<{ id: string; played: string[] }[]> {
  if (!pageIds.length) return [];

  return prisma.$queryRaw<{ id: string; played: string[] }[]>`
    SELECT id, COALESCE(jsonb_path_query_array(content, '$.sections[*] ? (@.played == true).id'), '[]'::jsonb) AS played
    FROM scenario_pages WHERE "campaignId" = ${campaignId} AND id = ANY(${pageIds}::text[])`;
}

export { contentWrite, toJson } from "./content-write";
