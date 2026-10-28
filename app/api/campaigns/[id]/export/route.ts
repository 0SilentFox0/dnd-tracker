import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { attachmentHeaders } from "@/lib/utils/api/api-response";
import { bundleErrorResponse } from "@/lib/utils/api/bundle-error";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["campaign.export"], async ({ actor }) => {
  try {
    const bundle = await exportCampaign(prisma, actor.campaignId);

    const date = new Date().toISOString().slice(0, 10);

    return NextResponse.json(bundle, { headers: attachmentHeaders(`campaign-${actor.campaignId}-${date}.json`) });
  } catch (error) {
    const response = bundleErrorResponse(error);

    if (response) return response;

    throw error;
  }
});
