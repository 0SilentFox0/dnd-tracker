import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { listPages, readContent } from "@/lib/server/scenario/page-store";
import { searchScenarioPages } from "@/lib/server/scenario/search";
import { docToMarkdown } from "@/lib/utils/scenario/markdown";
import type { ScenarioContent, ScenarioSection } from "@/types/scenario";

export function sectionToMarkdown(s: ScenarioSection): string {
  const rows = s.rows.map((r) => `### Рядок ${r.id}\n**Історія:**\n${docToMarkdown(r.story) || "—"}\n\n**Нотатки ДМ:**\n${docToMarkdown(r.notes) || "—"}`);

  return [`## ${s.title} [${s.id}]${s.played ? " (зіграно)" : ""}`, ...rows].join("\n\n");
}

export function contentToMarkdown(title: string, content: ScenarioContent, sectionId?: string): string {
  const sections = sectionId ? content.sections.filter((s) => s.id === sectionId) : content.sections;

  const legend = content.legend.length ? `Легенда: ${content.legend.map((l) => l.label).join(", ")}` : "";

  return [`# ${title}`, legend, ...sections.map(sectionToMarkdown)].filter(Boolean).join("\n\n");
}

export async function loadPageForAi(campaignId: string, pageId: string) {
  const page = await prisma.scenarioPage.findFirst({ where: { id: pageId, campaignId }, select: { id: true, title: true, kind: true, content: true } });

  if (!page) throw new AiToolError(`Сторінки ${pageId} немає в цій кампанії`);

  return { ...page, content: readContent(page.content) };
}

export const listScenarioPagesTool = defineTool({
  name: "list_scenario_pages",
  title: "Сторінки сценарію",
  description: "List all scenario pages of the campaign: id, kind (scene|hero), arc, title, status.",
  input: z.object({}),
  handler: async (ctx) => (await listPages(ctx.campaignId)).map(({ id, kind, arc, title, status }) => ({ id, kind, arc, title, status })),
});

export const readScenarioPageTool = defineTool({
  name: "read_scenario_page",
  title: "Прочитати сторінку сценарію",
  description:
    "Read a scenario page as the scenario markdown dialect: sections with [sectionId], rows with ids, story and DM notes. ||text|| is a DM-only secret. Pass sectionId to read one section.",
  input: z.object({ pageId: z.string().min(1), sectionId: z.string().min(1).optional() }),
  handler: async (ctx, { pageId, sectionId }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    return contentToMarkdown(page.title, page.content, sectionId);
  },
});

export const searchScenarioTool = defineTool({
  name: "search_scenario",
  title: "Пошук у сценарії",
  description: "Full-text search across all scenario pages (titles, stories, notes). Returns page, section and a snippet.",
  input: z.object({ query: z.string().trim().min(2).max(100) }),
  handler: async (ctx, { query }) => (await searchScenarioPages(ctx.campaignId, query)).slice(0, AI_LIMITS.searchHits),
});
