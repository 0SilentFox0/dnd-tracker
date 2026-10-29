import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { listPages, readContent } from "@/lib/server/scenario/page-store";
import { searchScenarioPages } from "@/lib/server/scenario/search";
import { findMentions } from "@/lib/utils/scenario/mentions";
import { chunkContentMarkdown, contentToMarkdown, outlineContent, sectionToMarkdown } from "@/lib/utils/scenario/read-chunks";

export { contentToMarkdown, sectionToMarkdown };

const MENTION_PAGE_SIZE = 100;

export async function loadPageForAi(campaignId: string, pageId: string) {
  const page = await prisma.scenarioPage.findFirst({ where: { id: pageId, campaignId }, select: { id: true, title: true, kind: true, content: true } });

  if (!page) throw new AiToolError(API_ERRORS.SCENARIO_PAGE_NOT_IN_CAMPAIGN, { id: pageId });

  return { ...page, content: readContent(page.content) };
}

export const listScenarioPagesTool = defineTool({
  name: "list_scenario_pages",
  scopes: ["ai"],
  title: "Scenario pages",
  description: "List all scenario pages of the campaign: id, kind (scene|hero), arc, title, status.",
  input: z.object({}),
  handler: async (ctx) => (await listPages(ctx.campaignId)).map(({ id, kind, arc, title, status }) => ({ id, kind, arc, title, status })),
});

export const readScenarioPageTool = defineTool({
  name: "read_scenario_page",
  scopes: ["ai"],
  title: "Read scenario page",
  description:
    "Read a scenario page as the scenario markdown dialect: sections with [sectionId], rows with ids, story and DM notes. ||text|| is a DM-only secret. Pass sectionId to read one section. Long pages come in chunks: the last line [next offset N of TOTAL] gives the offset for the next call; [row split] marks one oversize row cut in the middle.",
  input: z.object({ pageId: z.string().min(1), sectionId: z.string().min(1).optional(), offset: z.number().int().min(0).optional() }),
  handler: async (ctx, { pageId, sectionId, offset }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    return chunkContentMarkdown(page.title, page.content, { sectionId, offset, limit: AI_LIMITS.toolResultChars - 2000 }).text;
  },
});

export const outlineScenarioPageTool = defineTool({
  name: "outline_scenario_page",
  scopes: ["ai"],
  title: "Scenario page outline",
  description:
    "Compact map of a scenario page: sections [id], row ids with story/notes sizes in characters, a short text start and the offset of each section/row for read_scenario_page. Use it first on a large page, then read only what you need.",
  input: z.object({ pageId: z.string().min(1) }),
  handler: async (ctx, { pageId }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    return outlineContent(page.title, page.content);
  },
});

export const findScenarioMentionsTool = defineTool({
  name: "find_scenario_mentions",
  scopes: ["ai"],
  title: "Find scenario mentions",
  description:
    "Find every occurrence of a name in scenario story and DM notes, in any grammatical form (matched by word stem). Returns hits {pageId, sectionId, rowId, field, snippet, forms, inMention} (inMention = already a mention chip) and the distinct forms found. Paginated: up to 100 hits per call; pass the returned nextOffset as offset for the next call until it is null. Searches the whole campaign unless pageId/sectionId is given.",
  input: z.object({ query: z.string().trim().min(2).max(100), pageId: z.string().min(1).optional(), sectionId: z.string().min(1).optional(), offset: z.number().int().min(0).optional() }),
  handler: async (ctx, { query, pageId, sectionId, offset = 0 }) => {
    const pages = pageId
      ? [await loadPageForAi(ctx.campaignId, pageId)]
      : (await prisma.scenarioPage.findMany({ where: { campaignId: ctx.campaignId }, select: { id: true, title: true, kind: true, content: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] })).map((p) => ({ ...p, content: readContent(p.content) }));

    const all = pages.flatMap((p) => findMentions(p.content, query, { sectionId }).map((h) => ({ pageId: p.id, pageTitle: p.title, ...h })));

    const hits = all.slice(offset, offset + MENTION_PAGE_SIZE);

    const next = offset + hits.length;

    return { total: all.length, offset, nextOffset: next < all.length ? next : null, forms: [...new Set(all.flatMap((h) => h.forms))], hits };
  },
});

export const searchScenarioTool = defineTool({
  name: "search_scenario",
  scopes: ["ai"],
  title: "Scenario search",
  description: "Full-text search across all scenario pages (titles, stories, notes). Returns page, section and a snippet.",
  input: z.object({ query: z.string().trim().min(2).max(100) }),
  handler: async (ctx, { query }) => (await searchScenarioPages(ctx.campaignId, query)).slice(0, AI_LIMITS.searchHits),
});
