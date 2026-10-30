import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { pageFactsSchema } from "@/lib/schemas/scenario-index";
import { type PageSummary, pageSummarySchema } from "@/lib/schemas/scenario-summary";
import { type DigestPage, pageLine } from "@/lib/utils/scenario/digest/build-lines";
import { entityKey } from "@/lib/utils/scenario/index/build";
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
  outline: { id: string; title: string; played: boolean }[] | null;
}

const LEAD_SCAN_CHARS = 150;

function rankedEntities(facts: PageFacts): string[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const section of facts.sections) {
    for (const ref of section.refs) {
      if (ref.secret) continue;

      const key = entityKey(ref.type, ref.id);

      const prev = counts.get(key);

      counts.set(key, { label: prev?.label || ref.label.trim(), count: (prev?.count ?? 0) + ref.count });
    }
  }

  return [...counts.values()]
    .filter((e) => e.label)
    .sort((a, b) => b.count - a.count)
    .slice(0, AI_LIMITS.digestEntities)
    .map((e) => e.label);
}

function parseLeads(leads: string[] | null): Map<string, string> {
  const lines = new Map<string, string>();

  for (const lead of leads ?? []) {
    const at = lead.indexOf("\t");

    if (at < 0) continue;

    const text = lead.slice(at + 1);

    lines.set(lead.slice(0, at), Array.from(text).length >= LEAD_SCAN_CHARS ? `${text}…` : text);
  }

  return lines;
}

function toDigestPage(row: DigestRow, leads: Map<string, string>): DigestPage {
  const parsed = row.facts ? pageFactsSchema.safeParse(row.facts) : null;

  return {
    id: row.id,
    title: row.title,
    arc: row.arc,
    sortOrder: row.sortOrder,
    llm: row.digest?.trim() ? { digest: row.digest, stale: row.stale === true } : null,
    sections: (row.outline ?? []).map((s) => ({ title: s.title, played: s.played, lead: sectionLead(leads.get(s.id) ?? "", s.title, AI_LIMITS.digestLeadChars) })),
    entities: parsed?.success ? rankedEntities(parsed.data) : [],
  };
}

function leadsFitBudget(pages: DigestPage[]): boolean {
  const withoutLeads = pages.map((p) => pageLine(p, 1)).join("\n").length;

  const sections = pages.reduce((sum, p) => sum + (p.llm ? 0 : p.sections.length), 0);

  return withoutLeads + sections * (AI_LIMITS.digestLeadChars + 3) <= AI_LIMITS.digestChars;
}

export async function loadDigestItems(campaignId: string): Promise<DigestPage[]> {
  const rows = await prisma.$queryRaw<DigestRow[]>`
    SELECT p.id, p.title, p.arc, p."sortOrder", i.facts,
      s.summary->>'digest' AS digest, s.version < p.version AS stale,
      (SELECT jsonb_agg(jsonb_build_object('id', sec->>'id', 'title', sec->>'title', 'played', COALESCE((sec->>'played')::boolean, false)) ORDER BY o)
        FROM jsonb_array_elements(p.content->'sections') WITH ORDINALITY t(sec, o)) AS outline
    FROM scenario_pages p
    LEFT JOIN scenario_page_index i ON i."pageId" = p.id AND i.version = p.version
    LEFT JOIN scenario_page_summaries s ON s."pageId" = p.id
    WHERE p."campaignId" = ${campaignId}
    ORDER BY p."sortOrder", p.title, p.id`;

  const pages = rows.map((row) => toDigestPage(row, new Map()));

  if (!pages.length || !leadsFitBudget(pages)) return pages;

  const ids = rows.filter((r) => !r.digest?.trim()).map((r) => r.id);

  const leadRows = await prisma.$queryRaw<{ id: string; leads: string[] | null }[]>`
    SELECT p.id, array(SELECT m[1] || E'\t' || m[2] FROM regexp_matches(p."searchText", '§([^\t\n]*)\t([^\n]{0,' || ${LEAD_SCAN_CHARS}::int || '})', 'g') AS m) AS leads
    FROM scenario_pages p
    WHERE p."campaignId" = ${campaignId} AND p.id = ANY(${ids}::text[])`;

  const byPage = new Map(leadRows.map((r) => [r.id, parseLeads(r.leads)]));

  return rows.map((row) => toDigestPage(row, byPage.get(row.id) ?? new Map()));
}
