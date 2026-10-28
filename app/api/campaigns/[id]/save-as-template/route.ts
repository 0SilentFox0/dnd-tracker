import { NextResponse } from "next/server";

import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { saveAsTemplateSchema } from "@/lib/schemas/templates";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
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

    const bundle = await exportCampaign(prisma, id);

    const { campaign } = await createCampaignFromBundle({
      userId: accessResult.userId,
      name: data.name,
      description: data.description,
      bundle,
      kind: CampaignKind.TEMPLATE,
      visibility: CampaignVisibility.PRIVATE,
      createdFromId: id,
    });

    await invalidateCampaignLists([accessResult.userId]);

    return NextResponse.json(campaign);
  } catch (error) {
    return bundleErrorResponse(error) ?? handleApiError(error, { action: "save campaign as template" });
  }
}
