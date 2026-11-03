import type { Prisma } from "@prisma/client";

import "server-only";
import { BATTLE_SNAPSHOT_RETENTION_DAYS, BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";

export async function cleanupBattleSnapshots(
  now = new Date(),
  db: Pick<Prisma.TransactionClient, "battleScene" | "battleSnapshot"> = prisma,
): Promise<{ battles: number; snapshots: number }> {
  const cutoff = new Date(now.getTime() - BATTLE_SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60_000);

  const battles = await db.battleScene.findMany({
    where: { status: BattleStatus.COMPLETED, completedAt: { lt: cutoff } },
    select: { id: true },
  });

  if (battles.length === 0) return { battles: 0, snapshots: 0 };

  const { count } = await db.battleSnapshot.deleteMany({ where: { battleId: { in: battles.map((b) => b.id) } } });

  return { battles: battles.length, snapshots: count };
}
