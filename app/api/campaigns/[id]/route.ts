import { NextResponse } from "next/server";

import { kvDel } from "@/lib/cache/kv";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { updateCampaignSchema } from "@/lib/schemas";
import { requireAuth, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        dm: true,
      },
    });

    if (!campaign) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);
    }

    // Перевіряємо чи юзер є учасником кампанії
    const userMember = campaign.members.find(m => m.userId === userId);

    if (!userMember) {
      return errorResponse(API_ERRORS.FORBIDDEN, 403);
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return handleApiError(error, { action: "fetch campaign" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { userId } = accessResult;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!campaign) {
      return errorResponse(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);
    }

    const userMember = campaign.members.find((m) => m.userId === userId);

    if (!userMember || userMember.role !== CampaignRole.DM) {
      return errorResponse(API_ERRORS.FORBIDDEN, 403);
    }

    const data = await parseBody(updateCampaignSchema, request);

    if (data instanceof NextResponse) return data;

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description:
          data.description === undefined ? undefined : data.description || null,
        maxLevel: data.maxLevel,
        xpMultiplier: data.xpMultiplier,
        allowPlayerEdit: data.allowPlayerEdit,
        status: data.status,
      },
      include: {
        members: {
          include: { user: true },
        },
        dm: true,
      },
    });

    for (const m of updatedCampaign.members) {
      await kvDel(`campaigns:${m.userId}`);
    }

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    return handleApiError(error, { action: "update campaign" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const members = await prisma.campaignMember.findMany({
      where: { campaignId: id },
      select: { userId: true },
    });

    // Усі залежні таблиці мають onDelete: Cascade (або SetNull всередині кампанії).
    await prisma.campaign.delete({ where: { id } });

    for (const m of members) {
      await kvDel(`campaigns:${m.userId}`);
    }

    invalidateReference(Object.values(ReferenceKind), id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete campaign" });
  }
}
