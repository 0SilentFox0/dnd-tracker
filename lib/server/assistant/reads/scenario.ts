import { z } from 'zod';

import { readAction } from './define';

import 'server-only';
import { AI_LIMITS } from '@/lib/constants/ai';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import { listPages, readContent } from '@/lib/server/scenario/page-store';
import {
    pageIdsMatching,
    searchScenarioPages,
} from '@/lib/server/scenario/search';
import { findMentions, mentionPrefixes } from '@/lib/utils/scenario/mentions';
import {
    chunkContentMarkdown,
    contentToMarkdown,
    outlineContent,
    sectionToMarkdown,
} from '@/lib/utils/scenario/read-chunks';
import type { ScenarioContent } from '@/types/scenario';

export { contentToMarkdown, sectionToMarkdown };

const MENTION_PAGE_SIZE = 100;

// boundedOutput projects any result whose JSON exceeds ~22k, which would cut the trailer / hits, so budget the JSON form
function chunkWithinJson(
    title: string,
    content: ScenarioContent,
    opts: { sectionId?: string; offset?: number }
) {
    let limit = AI_LIMITS.toolResultJsonChars - 200;

    for (;;) {
        const { text } = chunkContentMarkdown(title, content, {
            ...opts,
            limit,
        });

        if (
            JSON.stringify(text).length <= AI_LIMITS.toolResultJsonChars ||
            limit <= 1
        )
            return text;

        limit = Math.max(1, Math.floor(limit * 0.9));
    }
}

const PAGE_SELECT = {
    id: true,
    title: true,
    kind: true,
    content: true,
} as const;

export async function loadPageForAi(campaignId: string, pageId: string) {
    const page = await prisma.scenarioPage.findFirst({
        where: { id: pageId, campaignId },
        select: PAGE_SELECT,
    });

    if (!page)
        throw new ContentError(
            API_ERRORS.SCENARIO_PAGE_NOT_IN_CAMPAIGN,
            404,
            undefined,
            { id: pageId }
        );

    return { ...page, content: readContent(page.content) };
}

async function loadCandidatePages(campaignId: string, query: string) {
    const ids = await pageIdsMatching(campaignId, mentionPrefixes(query));

    if (!ids.length) return [];

    const rows = await prisma.scenarioPage.findMany({
        where: { id: { in: ids }, campaignId },
        select: PAGE_SELECT,
    });

    const byId = new Map(rows.map((r) => [r.id, r]));

    return ids.flatMap((id) => {
        const row = byId.get(id);

        return row ? [{ ...row, content: readContent(row.content) }] : [];
    });
}

export const listScenarioPagesInput = z.strictObject({});

export const readScenarioPageInput = z.strictObject({
    pageId: z.string().min(1).max(200),
    sectionId: z.string().min(1).max(200).optional(),
    offset: z.number().int().min(0).max(10_000_000).optional(),
});

export const outlineScenarioPageInput = z.strictObject({
    pageId: z.string().min(1).max(200),
});

export const findScenarioMentionsInput = z.strictObject({
    query: z.string().trim().min(2).max(100),
    pageId: z.string().min(1).max(200).optional(),
    sectionId: z.string().min(1).max(200).optional(),
    offset: z.number().int().min(0).max(10_000_000).optional(),
});

export const searchScenarioInput = z.strictObject({
    query: z.string().trim().min(2).max(100),
});

export const LIST_SCENARIO_PAGES_ACTION = readAction({
    id: 'scenario.pages-list',
    title: 'Scenario pages',
    description:
        'All scenario pages of the campaign: id, kind, arc, title, status.',
    scope: 'scenario:read',
    input: listScenarioPagesInput,
    run: async ({ campaignId }) =>
        (await listPages(campaignId)).map(
            ({ id, kind, arc, title, status }) => ({
                id,
                kind,
                arc,
                title,
                status,
            })
        ),
});

export const READ_SCENARIO_PAGE_ACTION = readAction({
    id: 'scenario.page-read',
    title: 'Read scenario page',
    description: 'A scenario page (or one section) as chunked markdown.',
    scope: 'scenario:read',
    input: readScenarioPageInput,
    run: async ({ campaignId }, { pageId, sectionId, offset }) => {
        const page = await loadPageForAi(campaignId, pageId);

        return chunkWithinJson(page.title, page.content, { sectionId, offset });
    },
});

export const OUTLINE_SCENARIO_PAGE_ACTION = readAction({
    id: 'scenario.page-outline',
    title: 'Scenario page outline',
    description: 'Compact map of a scenario page with offsets for page-read.',
    scope: 'scenario:read',
    input: outlineScenarioPageInput,
    run: async ({ campaignId }, { pageId }) => {
        const page = await loadPageForAi(campaignId, pageId);

        return outlineContent(page.title, page.content);
    },
});

export const FIND_SCENARIO_MENTIONS_ACTION = readAction({
    id: 'scenario.mentions-find',
    title: 'Find scenario mentions',
    description: 'Every occurrence of a name in scenario story and DM notes.',
    scope: 'scenario:read',
    input: findScenarioMentionsInput,
    run: async ({ campaignId }, { query, pageId, sectionId, offset = 0 }) => {
        const pages = pageId
            ? [await loadPageForAi(campaignId, pageId)]
            : await loadCandidatePages(campaignId, query);

        const all = pages.flatMap((p) =>
            findMentions(p.content, query, { sectionId }).map((h) => ({
                pageId: p.id,
                pageTitle: p.title,
                ...h,
            }))
        );

        const forms = [...new Set(all.flatMap((h) => h.forms))];

        const candidates = all.slice(offset, offset + MENTION_PAGE_SIZE);

        let size = JSON.stringify({
            total: all.length,
            offset,
            nextOffset: all.length,
            forms,
            hits: [],
        }).length;

        const hits: typeof candidates = [];

        for (const hit of candidates) {
            size += JSON.stringify(hit).length + 1;

            if (hits.length && size > AI_LIMITS.toolResultJsonChars) break;

            hits.push(hit);
        }

        const next = offset + hits.length;

        return {
            total: all.length,
            offset,
            nextOffset: next < all.length ? next : null,
            forms,
            hits,
        };
    },
});

export const SEARCH_SCENARIO_ACTION = readAction({
    id: 'scenario.text-search',
    title: 'Scenario search',
    description: 'Full-text search across all scenario pages.',
    scope: 'scenario:read',
    input: searchScenarioInput,
    run: async ({ campaignId }, { query }) =>
        (await searchScenarioPages(campaignId, query)).slice(
            0,
            AI_LIMITS.searchHits
        ),
});
