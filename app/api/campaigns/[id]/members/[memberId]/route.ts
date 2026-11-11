import { NextResponse } from "next/server";
import { z } from "zod";

import { CampaignRole } from "@/lib/constants/campaigns";
import { setCampaignMemberRole, removeCampaignMember } from "@/lib/server/campaigns/action-service";
import { sessionDmActor } from "@/lib/utils/api/actor";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

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

const roleSchema = z.object({ role: z.enum([CampaignRole.DM, CampaignRole.PLAYER]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await parseBody(roleSchema, request);

    if (body instanceof NextResponse) return body;

    await setCampaignMemberRole(sessionDmActor(id, accessResult.userId), memberId, body.role);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "set member role" });
  }
}
