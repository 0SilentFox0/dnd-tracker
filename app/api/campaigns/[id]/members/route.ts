import { NextResponse } from "next/server";

import { loadCampaignMembers } from "@/lib/server/campaigns/action-service";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignMember } from "@/types/campaigns";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    const rows = await loadCampaignMembers(id);

    const members: CampaignMember[] = rows.map(({ user }) => ({
      id: user.id,
      displayName: user.displayName,
      ...(access.isDM && { email: user.email }),
    }));

    return NextResponse.json(members, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list campaign members" });
  }
}
