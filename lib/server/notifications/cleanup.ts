import type { Prisma } from "@prisma/client";

import "server-only";
import { NOTIFICATION_RETENTION_DAYS } from "@/lib/constants/notifications";
import { DAY_MS } from "@/lib/constants/time";
import { prisma } from "@/lib/db";

export async function cleanupReadNotifications(
  now = new Date(),
  db: Pick<Prisma.TransactionClient, "playerNotification"> = prisma,
): Promise<{ notificationsDeleted: number }> {
  const cutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS);

  const { count } = await db.playerNotification.deleteMany({ where: { readAt: { lt: cutoff } } });

  return { notificationsDeleted: count };
}
