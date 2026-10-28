import { NextResponse } from "next/server";

import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { importCampaignSchema, MAX_BUNDLE_BYTES } from "@/lib/schemas/templates";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { ensureDbUser } from "@/lib/server/users/db-user";
import { requireAuthUser } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bundleErrorResponse } from "@/lib/utils/api/bundle-error";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthUser();

    if (authResult instanceof NextResponse) return authResult;

    const { userId, authUser } = authResult;

    if (Number(request.headers.get("content-length")) > MAX_BUNDLE_BYTES) {
      return errorResponse(API_ERRORS.BUNDLE_TOO_LARGE, 413);
    }

    const data = await parseBody(importCampaignSchema, request, API_ERRORS.BUNDLE_INVALID);

    if (data instanceof NextResponse) return data;

    if (JSON.stringify(data.bundle).length > MAX_BUNDLE_BYTES) {
      return errorResponse(API_ERRORS.BUNDLE_TOO_LARGE, 413);
    }

    await ensureDbUser(authUser);

    const { campaign, warnings } = await createCampaignFromBundle({ userId, name: data.name, bundle: data.bundle });

    await invalidateCampaignLists([userId]);

    return NextResponse.json({ ...campaign, warnings });
  } catch (error) {
    return bundleErrorResponse(error) ?? handleApiError(error, { action: "import campaign" });
  }
}
