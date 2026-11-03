import type { Prisma } from "@prisma/client";

import "server-only";
import { BATTLE_SNAPSHOT_RETENTION_DAYS, BattleStatus } from "@/lib/constants/battle";
import { DAY_MS } from "@/lib/constants/time";
import { prisma } from "@/lib/db";

export async function cleanupBattleSnapshots(
  now = new Date(),
  db: Pick<Prisma.TransactionClient, "battleSnapshot"> = prisma,
): Promise<{ snapshots: number }> {
  const cutoff = new Date(now.getTime() - BATTLE_SNAPSHOT_RETENTION_DAYS * DAY_MS);

  const { count } = await db.battleSnapshot.deleteMany({ where: { battle: { status: BattleStatus.COMPLETED, completedAt: { lt: cutoff } } } });

  return { snapshots: count };
}
