import type { Prisma } from "@prisma/client";

import "server-only";
import { NOTIFICATION_RETENTION_DAYS } from "@/lib/constants/notifications";
import { prisma } from "@/lib/db";

export async function cleanupReadNotifications(
  now = new Date(),
  db: Pick<Prisma.TransactionClient, "playerNotification"> = prisma,
): Promise<{ notificationsDeleted: number }> {
  const cutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60_000);

  const { count } = await db.playerNotification.deleteMany({ where: { readAt: { lt: cutoff } } });

  return { notificationsDeleted: count };
}
