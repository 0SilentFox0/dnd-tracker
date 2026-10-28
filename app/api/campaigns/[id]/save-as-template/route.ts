import { NextResponse } from "next/server";

import { saveAsTemplateSchema } from "@/lib/schemas/templates";
import { saveCampaignAsTemplate } from "@/lib/server/campaigns/action-service";
import { ContentError } from "@/lib/server/content/errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bundleErrorResponse } from "@/lib/utils/api/bundle-error";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const data = await parseBody(saveAsTemplateSchema, request);

    if (data instanceof NextResponse) return data;

    const { campaign } = await saveCampaignAsTemplate({ campaignId: id, userId: accessResult.userId, isDM: true, via: "session", scopes: null }, data);

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return bundleErrorResponse(error) ?? handleApiError(error, { action: "save campaign as template" });
  }
}
