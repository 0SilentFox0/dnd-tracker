import type { Prisma, PrismaClient } from "@prisma/client";

import { SCENARIO_MAX_VERSIONS, SCENARIO_VERSION_INTERVAL_MS } from "@/lib/constants/scenario";

type Db = PrismaClient | Prisma.TransactionClient;

// reads the current content only when a snapshot is actually due — autosave runs every 1.5 s
export async function snapshotIfDue(db: Db, pageId: string, userId: string, options: { force?: boolean; now?: Date } = {}): Promise<boolean> {
  const now = options.now ?? new Date();

  if (!options.force) {
    const last = await db.scenarioPageVersion.findFirst({ where: { pageId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });

    if (last && now.getTime() - last.createdAt.getTime() < SCENARIO_VERSION_INTERVAL_MS) return false;
  }

  const page = await db.scenarioPage.findUnique({ where: { id: pageId }, select: { content: true } });

  if (!page) return false;

  await db.scenarioPageVersion.create({ data: { pageId, content: page.content as Prisma.InputJsonValue, createdBy: userId } });

  return true;
}

export async function pruneVersions(db: Db, pageId: string): Promise<void> {
  const stale = await db.scenarioPageVersion.findMany({ where: { pageId }, orderBy: { createdAt: "desc" }, skip: SCENARIO_MAX_VERSIONS, select: { id: true } });

  if (stale.length) await db.scenarioPageVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
}
