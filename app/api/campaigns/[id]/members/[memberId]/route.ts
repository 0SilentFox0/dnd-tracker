import { NextResponse } from "next/server";

import { removeCampaignMember } from "@/lib/server/campaigns/action-service";
import { sessionDmActor } from "@/lib/utils/api/actor";
import { requireDM } from "@/lib/utils/api/api-auth";
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

    await removeCampaignMember(sessionDmActor(id, accessResult.userId), memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove member" });
  }
}
