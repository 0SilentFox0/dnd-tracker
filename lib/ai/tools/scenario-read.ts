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
import type { ScenarioContent } from "@/types/scenario";

export { contentToMarkdown, sectionToMarkdown };

const MENTION_PAGE_SIZE = 100;

// boundedOutput projects any result whose JSON exceeds ~22k, which would cut the trailer / hits, so budget the JSON form
function chunkWithinJson(title: string, content: ScenarioContent, opts: { sectionId?: string; offset?: number }) {
  let limit = AI_LIMITS.toolResultJsonChars - 200;

  for (;;) {
    const { text } = chunkContentMarkdown(title, content, { ...opts, limit });

    if (JSON.stringify(text).length <= AI_LIMITS.toolResultJsonChars || limit <= 1) return text;

    limit = Math.max(1, Math.floor(limit * 0.9));
  }
}

const PAGE_SELECT = { id: true, title: true, kind: true, content: true } as const;

export async function loadPageForAi(campaignId: string, pageId: string) {
  const page = await prisma.scenarioPage.findFirst({ where: { id: pageId, campaignId }, select: PAGE_SELECT });

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
    "Read a scenario page as the scenario markdown dialect: sections with [sectionId], rows with ids, story and DM notes. ||text|| is a DM-only secret. Pass sectionId to read one section. An offset belongs to the same sectionId scope as the call that returned it: pass offset only with that same sectionId (or none); outline offsets are page-wide, so use them without sectionId. Long pages come in chunks: the last line [next offset N of TOTAL] gives the offset for the next call; [row split] marks one oversize row cut in the middle.",
  input: z.object({ pageId: z.string().min(1), sectionId: z.string().min(1).optional(), offset: z.number().int().min(0).optional() }),
  handler: async (ctx, { pageId, sectionId, offset }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    return chunkWithinJson(page.title, page.content, { sectionId, offset });
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
    "Find every occurrence of a name in scenario story and DM notes, in any grammatical form (matched by word stem). Returns hits {pageId, sectionId, rowId, field, snippet, forms, inMention} (inMention = already a mention chip) and the distinct forms found. Paginated: up to 100 hits per call (fewer when they are large); pass the returned nextOffset as offset for the next call until it is null. Searches the whole campaign unless pageId/sectionId is given.",
  input: z.object({ query: z.string().trim().min(2).max(100), pageId: z.string().min(1).optional(), sectionId: z.string().min(1).optional(), offset: z.number().int().min(0).optional() }),
  handler: async (ctx, { query, pageId, sectionId, offset = 0 }) => {
    const pages = pageId
      ? [await loadPageForAi(ctx.campaignId, pageId)]
      : (await prisma.scenarioPage.findMany({ where: { campaignId: ctx.campaignId }, select: PAGE_SELECT, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] })).map((p) => ({ ...p, content: readContent(p.content) }));

    const all = pages.flatMap((p) => findMentions(p.content, query, { sectionId }).map((h) => ({ pageId: p.id, pageTitle: p.title, ...h })));

    const forms = [...new Set(all.flatMap((h) => h.forms))];

    const candidates = all.slice(offset, offset + MENTION_PAGE_SIZE);

    let size = JSON.stringify({ total: all.length, offset, nextOffset: all.length, forms, hits: [] }).length;

    const hits: typeof candidates = [];

    for (const hit of candidates) {
      size += JSON.stringify(hit).length + 1;

      if (hits.length && size > AI_LIMITS.toolResultJsonChars) break;

      hits.push(hit);
    }

    const next = offset + hits.length;

    return { total: all.length, offset, nextOffset: next < all.length ? next : null, forms, hits };
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
