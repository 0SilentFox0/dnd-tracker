import "server-only";
import { prisma } from "@/lib/db";
import { readContent } from "@/lib/server/scenario/page-store";
import { openChapters, playedLookup, revealTargets } from "@/lib/utils/scenario/reveal";
import type { StoryChapter } from "@/types/scenario";

export async function loadStoryChapters(characterId: string, campaignId: string): Promise<StoryChapter[]> {
  const pages = await prisma.scenarioPage.findMany({ where: { campaignId, characterId, kind: "hero" }, select: { id: true, content: true }, orderBy: { sortOrder: "asc" } });

  if (!pages.length) return [];

  const contents = pages.map((p) => readContent(p.content));

  const ids = [...new Set(contents.flatMap((c) => revealTargets(c.sections).map((t) => t.pageId)))];

  // only played section ids leave the DB — scene pages are large and the sheet is read often
  const played = ids.length
    ? await prisma.$queryRaw<{ id: string; played: string[] }[]>`
        SELECT id, COALESCE(jsonb_path_query_array(content, '$.sections[*] ? (@.played == true).id'), '[]'::jsonb) AS played
        FROM scenario_pages WHERE "campaignId" = ${campaignId} AND id = ANY(${ids}::text[])`
    : [];

  const lookup = playedLookup(played);

  return contents.flatMap((c) => openChapters(c, lookup));
}
