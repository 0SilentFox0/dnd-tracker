import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { SpeciesProfile } from "@/systems/wfrp/rules/creation";
import { saveRaceProfile } from "@/systems/wfrp/server/race-profile";
import { SpeciesProfileSchema } from "@/systems/wfrp/server/schemas";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; raceId: string }> }) {
  try {
    const { id, raceId } = await ctx.params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    if (!ruleSystemOf(access.campaign.rules).creation) return errorResponse(API_ERRORS.SYSTEM_DRAFTS_UNSUPPORTED, 409);

    const profile = await parseBody(SpeciesProfileSchema, req);

    if (profile instanceof NextResponse) return profile;

    return NextResponse.json(await saveRaceProfile(id, raceId, profile as SpeciesProfile));
  } catch (error) {
    return handleApiError(error, { action: "race-profiles.save" });
  }
}
