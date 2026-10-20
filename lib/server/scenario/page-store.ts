import type { Prisma } from "@prisma/client";

import "server-only";
import { SCENARIO_MAX_VERSIONS, SCENARIO_VERSION_INTERVAL_MS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { emptyContent } from "@/lib/utils/scenario/structure";
import type { ScenarioContent, ScenarioPage, ScenarioPageKind, ScenarioPageStatus, ScenarioPageSummary } from "@/types/scenario";

export const SUMMARY_SELECT = { id: true, kind: true, arc: true, title: true, subtitle: true, status: true, sortOrder: true, characterId: true, version: true, updatedAt: true } as const;

type SummaryRow = Prisma.ScenarioPageGetPayload<{ select: typeof SUMMARY_SELECT }>;

export function readContent(json: unknown): ScenarioContent {
  const parsed = scenarioContentSchema.safeParse(json);

  return parsed.success ? parsed.data : emptyContent();
}

// explicit pick: rows may carry content/searchText, which must not leak into summaries (egress)
export function toSummary(row: SummaryRow): ScenarioPageSummary {
  const { id, kind, arc, title, subtitle, status, sortOrder, characterId, version, updatedAt } = row;

  return { id, kind: kind as ScenarioPageKind, arc, title, subtitle, status: status as ScenarioPageStatus, sortOrder, characterId, version, updatedAt: updatedAt.toISOString() };
}

export function toPage(row: SummaryRow & { content: unknown }): ScenarioPage {
  return { ...toSummary(row), content: readContent(row.content) };
}

export const OWNED_SELECT = { id: true, campaignId: true, version: true, title: true } as const;

export async function listPages(campaignId: string): Promise<ScenarioPageSummary[]> {
  const rows = await prisma.scenarioPage.findMany({ where: { campaignId }, select: SUMMARY_SELECT, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });

  return rows.map(toSummary);
}

export async function getPage(campaignId: string, pageId: string): Promise<ScenarioPage | null> {
  const row = await prisma.scenarioPage.findFirst({ where: { id: pageId, campaignId }, select: { ...SUMMARY_SELECT, content: true } });

  return row ? toPage(row) : null;
}

// reads the current content only when a snapshot is actually due — autosave runs every 1.5 s
export async function snapshotIfDue(pageId: string, userId: string, options: { force?: boolean; now?: Date } = {}): Promise<boolean> {
  const now = options.now ?? new Date();

  if (!options.force) {
    const last = await prisma.scenarioPageVersion.findFirst({ where: { pageId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });

    if (last && now.getTime() - last.createdAt.getTime() < SCENARIO_VERSION_INTERVAL_MS) return false;
  }

  const page = await prisma.scenarioPage.findUnique({ where: { id: pageId }, select: { content: true } });

  if (!page) return false;

  await prisma.scenarioPageVersion.create({ data: { pageId, content: page.content as Prisma.InputJsonValue, createdBy: userId } });

  return true;
}

export async function pruneVersions(pageId: string): Promise<void> {
  const stale = await prisma.scenarioPageVersion.findMany({ where: { pageId }, orderBy: { createdAt: "desc" }, skip: SCENARIO_MAX_VERSIONS, select: { id: true } });

  if (stale.length) await prisma.scenarioPageVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
}
