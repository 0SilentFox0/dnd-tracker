import "server-only";
import { SCENARIO_SEARCH_LIMIT } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { SNIPPET_RADIUS, snippetFromWindow } from "@/lib/utils/scenario/search-text";
import type { ScenarioSearchHit } from "@/types/scenario";

type Row = { id: string; title: string; sectionId: string | null; win: string; at: number; cutBefore: boolean };

// the match is located in SQL so only a short window per page leaves the DB (searchText of a scene is 50-150 KB)
function searchRows(campaignId: string, q: string) {
  return prisma.$queryRaw<Row[]>`
    WITH hit AS (
      SELECT id, title, "sortOrder", "searchText" AS st, strpos(lower("searchText"), lower(${q}::text)) AS pos
      FROM scenario_pages WHERE "campaignId" = ${campaignId}
    ), found AS (
      SELECT id, title, "sortOrder", st, pos, pos - length((regexp_match(substring(st for pos), '[^' || chr(10) || ']*$'))[1]) + 1 AS ls
      FROM hit WHERE pos > 0 ORDER BY "sortOrder" ASC LIMIT ${SCENARIO_SEARCH_LIMIT}::int
    ), head AS (
      SELECT *, strpos(substring(st from ls for 80), chr(9)) AS tab, strpos(substring(st from ls for 80), chr(10)) AS nl FROM found
    ), bounds AS (
      SELECT *, CASE WHEN substr(st, ls, 1) = '§' AND tab > 0 AND (nl = 0 OR tab < nl) THEN tab ELSE 0 END AS ptab FROM head
    ), win AS (
      SELECT *, greatest(pos - ${SNIPPET_RADIUS}::int, ls + ptab) AS start FROM bounds
    )
    SELECT id, title,
      CASE WHEN ptab > 0 THEN substring(st from ls + 1 for ptab - 2) END AS "sectionId",
      substring(st from start for (pos - start) + length(${q}::text) + ${SNIPPET_RADIUS}::int + 1) AS win,
      pos - start AS at,
      start > ls + ptab AS "cutBefore"
    FROM win ORDER BY "sortOrder" ASC`;
}

export async function searchScenarioPages(campaignId: string, q: string): Promise<ScenarioSearchHit[]> {
  const rows = await searchRows(campaignId, q);

  return rows.flatMap((r) => {
    const snippet = snippetFromWindow({ win: r.win, at: Number(r.at), cutBefore: r.cutBefore, needleLength: q.length });

    return snippet ? [{ pageId: r.id, pageTitle: r.title, sectionId: r.sectionId, snippet }] : [];
  });
}
