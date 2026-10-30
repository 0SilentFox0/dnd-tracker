import { NextResponse } from "next/server";

import { campaignListKey } from "@/lib/cache/campaign-list";
import { kvGet, kvSet } from "@/lib/cache/kv";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { createCampaignSchema } from "@/lib/schemas";
import { CAMPAIGN_OMIT, createCampaignForUser } from "@/lib/server/campaigns/create-campaign";
import { ensureDbUser, PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { requireAuth, requireAuthUser } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bundleErrorResponse } from "@/lib/utils/api/bundle-error";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

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

    const created = await createCampaignForUser(userId, data, { locale: await getRequestLocale() });

    if (!created.ok) {
      return created.status === 404
        ? errorResponse(API_ERRORS.TEMPLATE_NOT_FOUND, 404)
        : errorResponse(API_ERRORS.TEMPLATE_FORBIDDEN, 403);
    }

    const { campaign, warnings } = created;

    return NextResponse.json(warnings.length > 0 ? { ...campaign, warnings } : campaign);
  } catch (error) {
    return bundleErrorResponse(error) ?? handleApiError(error, { action: "create campaign" });
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
      where: { kind: CampaignKind.CAMPAIGN, members: { some: { userId } } },
      include: { members: { include: { user: { select: PUBLIC_USER_SELECT } } } },
      omit: CAMPAIGN_OMIT,
      orderBy: { updatedAt: "desc" },
    });

    await kvSet(cacheKey, campaigns);

    return NextResponse.json(campaigns, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list campaigns" });
  }
}
