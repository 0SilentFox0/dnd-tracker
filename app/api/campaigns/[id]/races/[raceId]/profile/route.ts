import { NextResponse } from "next/server";

import { saveRaceProfile } from "@/lib/server/races/race-profile";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; raceId: string }> }) {
  try {
    const { id, raceId } = await ctx.params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const profile = await parseBody(SpeciesProfileSchema, req);

    if (profile instanceof NextResponse) return profile;

    return NextResponse.json(await saveRaceProfile(id, raceId, profile as SpeciesProfile));
  } catch (error) {
    return handleApiError(error, { action: "race-profiles.save" });
  }
}
