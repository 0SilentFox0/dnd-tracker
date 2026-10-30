import "server-only";
import { prisma } from "@/lib/db";
import { type PageSummary, pageSummarySchema } from "@/lib/schemas/scenario-summary";
import type { DigestItem } from "@/lib/utils/scenario/summary/digest";
import { summaryInputHash } from "@/lib/utils/scenario/summary/hash";
import type { SummaryInputPage } from "@/lib/utils/scenario/summary/input";
import type { ScenarioSummaryEntry } from "@/types/scenario";

export interface SummaryRowInput {
  pageId: string;
  campaignId: string;
  version: number;
  summary: PageSummary;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  inputHash: string;
}

export async function upsertSummary(row: SummaryRowInput): Promise<void> {
  // older versions must not overwrite newer ones; the page may be deleted mid-generation, so insert only while it exists
  await prisma.$executeRaw`INSERT INTO scenario_page_summaries ("pageId", "campaignId", version, summary, provider, model, "inputTokens", "outputTokens", "inputHash", "createdAt", "updatedAt")
    SELECT id, "campaignId", ${row.version}::int, ${JSON.stringify(row.summary)}::jsonb, ${row.provider}::text, ${row.model}::text, ${row.inputTokens}::int, ${row.outputTokens}::int, ${row.inputHash}::text, now(), now()
    FROM scenario_pages WHERE id = ${row.pageId}
    ON CONFLICT ("pageId") DO UPDATE SET version = EXCLUDED.version, summary = EXCLUDED.summary, provider = EXCLUDED.provider, model = EXCLUDED.model,
      "inputTokens" = EXCLUDED."inputTokens", "outputTokens" = EXCLUDED."outputTokens", "inputHash" = EXCLUDED."inputHash", "updatedAt" = now()
    WHERE scenario_page_summaries.version <= EXCLUDED.version`;
}

// played/revealed toggles bump the page version without changing the summary input; keep such summaries fresh
export async function refreshSummaryFreshness(pageId: string, newVersion: number, page: SummaryInputPage): Promise<void> {
  try {
    await prisma.$executeRaw`UPDATE scenario_page_summaries SET version = ${newVersion}::int
      WHERE "pageId" = ${pageId} AND "inputHash" = ${summaryInputHash(page)} AND version < ${newVersion}::int`;
  } catch (error) {
    console.error("[summary freshness]", error instanceof Error ? error.name : "unknown");
  }
}

export async function loadSummaryRow(pageId: string): Promise<{ version: number; summary: PageSummary; model: string; createdAt: Date } | null> {
  const row = await prisma.scenarioPageSummary.findUnique({ where: { pageId }, select: { version: true, summary: true, model: true, createdAt: true } });

  const parsed = row ? pageSummarySchema.safeParse(row.summary) : null;

  return row && parsed?.success ? { version: row.version, summary: parsed.data, model: row.model, createdAt: row.createdAt } : null;
}

export async function loadSummaries(campaignId: string): Promise<{ summaries: Record<string, ScenarioSummaryEntry> }> {
  const rows = await prisma.scenarioPageSummary.findMany({
    where: { campaignId },
    select: { pageId: true, version: true, summary: true, model: true, createdAt: true, page: { select: { version: true } } },
  });

  const summaries: Record<string, ScenarioSummaryEntry> = {};

  for (const row of rows) {
    const parsed = pageSummarySchema.safeParse(row.summary);

    if (!parsed.success) continue;

    summaries[row.pageId] = { summary: parsed.data, version: row.version, stale: row.version < row.page.version, model: row.model, createdAt: row.createdAt.toISOString() };
  }

  return { summaries };
}

export async function loadDigestItems(campaignId: string): Promise<DigestItem[]> {
  const rows = await prisma.$queryRaw<{ id: string; title: string; sortOrder: number; digest: string | null; stale: boolean }[]>`
    SELECT p.id, p.title, p."sortOrder", s.summary->>'digest' AS digest, s.version < p.version AS stale
    FROM scenario_page_summaries s JOIN scenario_pages p ON p.id = s."pageId"
    WHERE s."campaignId" = ${campaignId}
    ORDER BY p."sortOrder", p.title, p.id`;

  return rows.flatMap((r) => (r.digest?.trim() ? [{ id: r.id, title: r.title, sortOrder: r.sortOrder, digest: r.digest, stale: r.stale }] : []));
}
