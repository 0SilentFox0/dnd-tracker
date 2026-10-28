import { NextResponse } from "next/server";

import { removeCampaignMember } from "@/lib/server/campaigns/action-service";
import { ContentError } from "@/lib/server/content/errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    await removeCampaignMember({ campaignId: id, userId: accessResult.userId, isDM: true, via: "session", scopes: null }, memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "remove member" });
  }
}
