import { NextResponse } from "next/server";

import { saveAsTemplateSchema } from "@/lib/schemas/templates";
import { saveCampaignAsTemplate } from "@/lib/server/campaigns/action-service";
import { sessionDmActor } from "@/lib/utils/api/actor";
import { requireDM } from "@/lib/utils/api/api-auth";
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

    const { campaign } = await saveCampaignAsTemplate(sessionDmActor(id, accessResult.userId), data);

    return NextResponse.json(campaign);
  } catch (error) {
    return bundleErrorResponse(error) ?? handleApiError(error, { action: "save campaign as template" });
  }
}
