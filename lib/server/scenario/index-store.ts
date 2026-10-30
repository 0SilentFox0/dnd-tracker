import "server-only";
import { ACTIVE_CHARACTER } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { pageFactsSchema } from "@/lib/schemas/scenario-index";
import { listPages, readContent } from "@/lib/server/scenario/page-store";
import { buildScenarioIndex, entityKey } from "@/lib/utils/scenario/index/build";
import { extractPageFacts } from "@/lib/utils/scenario/index/extract";
import type { MentionType, PageFacts, ScenarioIndex } from "@/types/scenario";

const BATCH = 20;

type NameRow = { id: string; name: string };

export async function upsertPageFacts(pageId: string, campaignId: string, version: number, facts: PageFacts) {
  // an older build racing a newer one must not overwrite newer facts
  await prisma.$executeRaw`INSERT INTO scenario_page_index ("pageId", "campaignId", version, facts, "updatedAt")
    VALUES (${pageId}, ${campaignId}, ${version}, ${JSON.stringify(facts)}::jsonb, now())
    ON CONFLICT ("pageId") DO UPDATE SET version = EXCLUDED.version, facts = EXCLUDED.facts, "updatedAt" = now()
    WHERE scenario_page_index.version <= EXCLUDED.version`;
}

async function loadFacts(campaignId: string, pages: { id: string; version: number }[]): Promise<Map<string, PageFacts>> {
  const facts = new Map<string, PageFacts>();

  const cached = await prisma.scenarioPageIndex.findMany({ where: { campaignId }, select: { pageId: true, version: true, facts: true } });

  const cachedById = new Map(cached.map((row) => [row.pageId, row]));

  const stale: string[] = [];

  for (const page of pages) {
    const row = cachedById.get(page.id);

    const parsed = row && row.version === page.version ? pageFactsSchema.safeParse(row.facts) : null;

    if (parsed?.success) facts.set(page.id, parsed.data);
    else stale.push(page.id);
  }

  for (let i = 0; i < stale.length; i += BATCH) {
    const rows = await prisma.scenarioPage.findMany({ where: { id: { in: stale.slice(i, i + BATCH) }, campaignId }, select: { id: true, version: true, content: true } });

    await Promise.all(
      rows.map(async (row) => {
        const pageFacts = extractPageFacts(readContent(row.content));

        facts.set(row.id, pageFacts);
        await upsertPageFacts(row.id, campaignId, row.version, pageFacts);
      }),
    );
  }

  return facts;
}

async function resolveEntities(campaignId: string, facts: Map<string, PageFacts>): Promise<Map<string, { label: string }>> {
  const ids = new Map<MentionType, Set<string>>();

  for (const page of facts.values()) {
    for (const section of page.sections) {
      for (const ref of section.refs) ids.set(ref.type, (ids.get(ref.type) ?? new Set()).add(ref.id));
    }
  }

  const find = (type: MentionType): Promise<NameRow[]> => {
    const where = { id: { in: [...(ids.get(type) ?? [])] }, campaignId };

    const select = { id: true, name: true };

    switch (type) {
      case "unit":
        return prisma.unit.findMany({ where, select });
      case "artifact":
        return prisma.artifact.findMany({ where, select });
      case "character":
        return prisma.character.findMany({ where: { ...where, ...ACTIVE_CHARACTER }, select });
      case "spell":
        return prisma.spell.findMany({ where, select });
      case "battle":
        return prisma.battleScene.findMany({ where, select });
      case "acquaintance":
        return prisma.acquaintance.findMany({ where, select });
      case "marker":
        return prisma.worldMarker.findMany({ where: { id: where.id, map: { campaignId } }, select });
    }
  };

  const types = [...ids.keys()];

  const groups = await Promise.all(types.map(find));

  const resolved = new Map<string, { label: string }>();

  groups.forEach((rows, i) => rows.forEach((row) => resolved.set(entityKey(types[i], row.id), { label: row.name })));

  return resolved;
}

export async function loadScenarioIndex(campaignId: string): Promise<ScenarioIndex> {
  const pages = await listPages(campaignId);

  const facts = await loadFacts(campaignId, pages);

  const resolved = await resolveEntities(campaignId, facts);

  return buildScenarioIndex({ pages, facts, resolved });
}
