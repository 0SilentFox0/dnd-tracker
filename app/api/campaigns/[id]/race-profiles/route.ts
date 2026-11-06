import { NextResponse } from "next/server";

import { listRaceProfiles } from "@/lib/server/races/race-profile";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    return NextResponse.json({ profiles: await listRaceProfiles(id) }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "race-profiles.list" });
  }
}
