import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { campaignListKey, invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { kvGet, kvSet } from "@/lib/cache/kv";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createCampaignSchema } from "@/lib/schemas";
import { requireAuth, requireAuthUser } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { ensureDbUser, PUBLIC_USER_SELECT } from "@/lib/utils/api/db-user";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { generateInviteCode } from "@/lib/utils/campaigns/invite-code";

const INVITE_CODE_ATTEMPTS = 5;

function isInviteCodeClash(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes("inviteCode")
  );
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthUser();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId, authUser } = authResult;

    const data = await parseBody(createCampaignSchema, request);

    if (data instanceof NextResponse) return data;

    await ensureDbUser(authUser);

    const create = () =>
      prisma.campaign.create({
        data: {
          name: data.name,
          description: data.description,
          inviteCode: generateInviteCode(),
          dmUserId: userId,
          maxLevel: data.maxLevel,
          allowPlayerEdit: data.allowPlayerEdit,
          members: { create: { userId, role: CampaignRole.DM } },
        },
        include: { members: true },
      });

    for (let attempt = 1; ; attempt++) {
      try {
        const campaign = await create();

        await invalidateCampaignLists([userId]);

        return NextResponse.json(campaign);
      } catch (error) {
        if (attempt >= INVITE_CODE_ATTEMPTS || !isInviteCodeClash(error)) throw error;
      }
    }
  } catch (error) {
    return handleApiError(error, { action: "create campaign" });
  }
}

export async function GET() {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const cacheKey = campaignListKey(userId);

    const cached = await kvGet<unknown[]>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, { headers: PRIVATE_NO_STORE_HEADERS });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { members: { some: { userId } } },
      include: { members: { include: { user: { select: PUBLIC_USER_SELECT } } } },
      orderBy: { updatedAt: "desc" },
    });

    await kvSet(cacheKey, campaigns);

    return NextResponse.json(campaigns, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list campaigns" });
  }
}
