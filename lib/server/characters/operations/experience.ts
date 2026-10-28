import { NextResponse } from "next/server";

import { guardedCharacterHandler, operationDM } from "../operation-context";

import { awardExperience } from "@/app/api/campaigns/[id]/experience/experience-handler";
import { experienceSchema } from "@/lib/schemas/out-of-combat";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CampaignRouteContext } from "@/types/api";

async function POSTImpl(request: Request, { params }: CampaignRouteContext, actor?: Actor) {
  try {
    const { id } = await params;

    const access = await operationDM(id, actor);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(experienceSchema, request);

    if (body instanceof NextResponse) return body;

    return await awardExperience(access, body);
  } catch (error) {
    return handleApiError(error, { action: "award experience" });
  }
}

export const POST = guardedCharacterHandler(POSTImpl, "experience");
