import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { campaignIdFromChecklistKey } from "@/lib/onboarding/flag-keys";
import { setOnboardingFlagSchema } from "@/lib/schemas";
import { setOnboardingFlag } from "@/lib/server/onboarding/flags";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth();

    if (auth instanceof NextResponse) return auth;

    const body = await parseBody(setOnboardingFlagSchema, request);

    if (body instanceof NextResponse) return body;

    const campaignId = campaignIdFromChecklistKey(body.key);

    if (campaignId) {
      const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId: auth.userId } }, select: { id: true } });

      if (!member) return errorResponse(API_ERRORS.FORBIDDEN, 403);
    }

    await setOnboardingFlag(auth.userId, body.key, body.value ?? null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "set onboarding flag" });
  }
}
