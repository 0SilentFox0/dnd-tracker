import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { pageFactsSchema } from "@/lib/schemas/scenario-index";
import { type PageSummary, pageSummarySchema } from "@/lib/schemas/scenario-summary";
import type { DigestPage } from "@/lib/utils/scenario/digest/build-lines";
import { sectionLead } from "@/lib/utils/scenario/search-text";
import { summaryInputHash } from "@/lib/utils/scenario/summary/hash";
import type { SummaryInputPage } from "@/lib/utils/scenario/summary/input";
import type { PageFacts, ScenarioSummaryEntry } from "@/types/scenario";

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

interface DigestRow {
  id: string;
  title: string;
  arc: string | null;
  sortOrder: number;
  facts: unknown;
  digest: string | null;
  stale: boolean | null;
  leads: string[] | null;
}

const LEAD_SCAN_CHARS = 250;

function rankedEntities(facts: PageFacts): string[] {
  const counts = new Map<string, number>();

  for (const section of facts.sections) for (const ref of section.refs) if (ref.label.trim()) counts.set(ref.label, (counts.get(ref.label) ?? 0) + ref.count);

  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, AI_LIMITS.digestEntities).map(([label]) => label);
}

function toDigestPage(row: DigestRow): DigestPage {
  const lines = new Map<string, string>();

  for (const lead of row.leads ?? []) {
    const at = lead.indexOf("\t");

    if (at >= 0) lines.set(lead.slice(0, at), lead.slice(at + 1));
  }

  const parsed = row.facts ? pageFactsSchema.safeParse(row.facts) : null;

  const facts = parsed?.success ? parsed.data : null;

  const sections = facts
    ? facts.sections.map((s) => ({ title: s.title, played: s.played, lead: sectionLead(lines.get(s.id) ?? "", s.title, AI_LIMITS.digestLeadChars) }))
    : [...lines.values()].map((line) => ({ title: sectionLead(line, "", AI_LIMITS.digestLeadChars), played: false, lead: "" }));

  return {
    id: row.id,
    title: row.title,
    arc: row.arc,
    sortOrder: row.sortOrder,
    llm: row.digest?.trim() ? { digest: row.digest, stale: row.stale === true } : null,
    sections,
    entities: facts ? rankedEntities(facts) : [],
  };
}

export async function loadDigestItems(campaignId: string): Promise<DigestPage[]> {
  const rows = await prisma.$queryRaw<DigestRow[]>`
    SELECT p.id, p.title, p.arc, p."sortOrder",
      CASE WHEN i.version = p.version THEN i.facts END AS facts,
      s.summary->>'digest' AS digest, s.version < p.version AS stale,
      array(SELECT m[1] || E'\t' || m[2] FROM regexp_matches(p."searchText", '§([^\t\n]*)\t([^\n]{0,' || ${LEAD_SCAN_CHARS}::int || '})', 'g') AS m) AS leads
    FROM scenario_pages p
    LEFT JOIN scenario_page_index i ON i."pageId" = p.id AND i.version = p.version
    LEFT JOIN scenario_page_summaries s ON s."pageId" = p.id
    WHERE p."campaignId" = ${campaignId}
    ORDER BY p."sortOrder", p.title, p.id`;

  return rows.map(toDigestPage);
}
