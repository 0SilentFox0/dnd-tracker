import { NextResponse } from "next/server";

import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { listRaceProfiles } from "@/systems/wfrp/server/race-profile";

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
