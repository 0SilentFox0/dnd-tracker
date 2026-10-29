import { NextResponse } from "next/server";

import { NOTIFICATIONS_LIST_LIMIT,type NotificationType } from "@/lib/constants/notifications";
import { prisma } from "@/lib/db";
import { markNotificationsReadSchema } from "@/lib/schemas/notifications";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { PlayerNotification } from "@/types/notifications";

export async function listNotificationsHandler(campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const rows = await prisma.playerNotification.findMany({
      where: { userId: access.userId, campaignId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATIONS_LIST_LIMIT,
      select: { id: true, type: true, refId: true, href: true, createdAt: true },
    });

    const body: PlayerNotification[] = rows.map((r) => ({
      id: r.id,
      type: r.type as NotificationType,
      refId: r.refId,
      href: r.href,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error, { action: "list notifications" });
  }
}

export async function markNotificationsReadHandler(req: Request, campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(markNotificationsReadSchema, req);

    if (body instanceof NextResponse) return body;

    const { count } = await prisma.playerNotification.updateMany({
      where: {
        userId: access.userId,
        campaignId,
        readAt: null,
        ...(body.types?.length ? { type: { in: body.types } } : {}),
        ...(body.refIds?.length ? { refId: { in: body.refIds } } : {}),
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error, { action: "mark notifications read" });
  }
}
