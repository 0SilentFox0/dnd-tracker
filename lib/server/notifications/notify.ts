import { after } from "next/server";
import type { Prisma } from "@prisma/client";

import "server-only";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import type { NotificationType } from "@/lib/constants/notifications";
import { prisma } from "@/lib/db";
import { NOTIFICATIONS_CHANGED_EVENT, notifyChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import type { CharacterNotificationEvent } from "@/lib/utils/notifications/events";
import { notificationHref } from "@/lib/utils/notifications/href";
import type { NotificationsChangedEvent } from "@/types/notifications";

export type NotifyDb = Pick<Prisma.TransactionClient, "playerNotification">;

export interface NotificationItem {
  type: NotificationType;
  refId: string;
  href: string;
}

interface NotificationRow extends NotificationItem {
  userId: string;
}

function publish(campaignId: string, userIds: string[]): void {
  const event: NotificationsChangedEvent = { campaignId };

  const send = () =>
    Promise.all(userIds.map((u) => safePusherTrigger(pusherServer, notifyChannelName(u), NOTIFICATIONS_CHANGED_EVENT, event, { action: "notify players" })));

  try {
    after(send);
  } catch {
    // outside a request scope (tsx scripts): fire and forget
    void send();
  }
}

async function writeRows(campaignId: string, rows: NotificationRow[], db: NotifyDb): Promise<number> {
  if (!rows.length) return 0;

  // delete + skipDuplicates: a re-sent event flips a read row back to unread without a duplicate
  await db.playerNotification.deleteMany({ where: { OR: rows.map(({ userId, type, refId }) => ({ userId, type, refId })) } });
  await db.playerNotification.createMany({ data: rows.map((row) => ({ ...row, campaignId })), skipDuplicates: true });
  publish(campaignId, [...new Set(rows.map((r) => r.userId))]);

  return rows.length;
}

export function notifyPlayers(
  input: { campaignId: string; userIds: string[]; items: NotificationItem[] },
  db: NotifyDb = prisma,
): Promise<number> {
  const rows = [...new Set(input.userIds)].flatMap((userId) => input.items.map((item) => ({ userId, ...item })));

  return writeRows(input.campaignId, rows, db);
}

export async function notifyCharacterOwners(
  input: { campaignId: string; actorUserId: string | null; events: CharacterNotificationEvent[] },
  db: NotifyDb & Pick<Prisma.TransactionClient, "character"> = prisma,
): Promise<number> {
  if (!input.events.length) return 0;

  const characters = await db.character.findMany({
    where: { id: { in: [...new Set(input.events.map((e) => e.characterId))] }, campaignId: input.campaignId },
    select: { id: true, controlledBy: true, type: true, status: true },
  });

  const owners = new Map<string, string>();

  for (const c of characters) {
    if (c.type === CharacterType.PLAYER && c.status === CharacterStatus.ACTIVE && c.controlledBy && c.controlledBy !== input.actorUserId) {
      owners.set(c.id, c.controlledBy);
    }
  }

  const rows = input.events.flatMap((e) => {
    const userId = owners.get(e.characterId);

    return userId ? [{ userId, type: e.type, refId: e.refId, href: notificationHref(input.campaignId, e.type, e.refId) }] : [];
  });

  return writeRows(input.campaignId, rows, db);
}

export async function notifyCampaignPlayers(
  input: { campaignId: string; items: NotificationItem[]; exceptUserId?: string },
  db: NotifyDb & Pick<Prisma.TransactionClient, "campaignMember"> = prisma,
): Promise<number> {
  const members = await db.campaignMember.findMany({
    where: { campaignId: input.campaignId, role: CampaignRole.PLAYER },
    select: { userId: true },
  });

  return notifyPlayers(
    { campaignId: input.campaignId, userIds: members.map((m) => m.userId).filter((id) => id !== input.exceptUserId), items: input.items },
    db,
  );
}
