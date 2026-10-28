import { NextResponse } from "next/server";

import { awardExperience } from "./experience-handler";

import { experienceSchema } from "@/lib/schemas/out-of-combat";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CampaignRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(experienceSchema, request);

    if (body instanceof NextResponse) return body;

    return await awardExperience(access, body);
  } catch (error) {
    return handleApiError(error, { action: "award experience" });
  }
}
