import { NextResponse } from "next/server";

import { campaignIdFromChecklistKey } from "@/lib/onboarding/flag-keys";
import { setOnboardingFlagSchema } from "@/lib/schemas";
import { setOnboardingFlag } from "@/lib/server/onboarding/flags";
import { requireAuth, requireCampaignAccess } from "@/lib/utils/api/api-auth";
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
      const access = await requireCampaignAccess(campaignId);

      if (access instanceof NextResponse) return access;
    }

    await setOnboardingFlag(auth.userId, body.key, body.value ?? null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "set onboarding flag" });
  }
}
