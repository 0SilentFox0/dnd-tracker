import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { mergeRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(access.campaign.rules);
  } catch (error) {
    return handleApiError(error, { action: "get campaign rules" });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const patch = await parseBody(RulesetPatchSchema, req, API_ERRORS.INVALID_RULES);

    if (patch instanceof NextResponse) return patch;

    const merged = mergeRules(access.campaign.rules, patch);

    if (!merged.ok) return errorResponse(API_ERRORS.INVALID_RULES, 400, merged.issues);

    await prisma.campaign.update({ where: { id }, data: { rules: merged.rules as Prisma.InputJsonObject } });

    return NextResponse.json(merged.rules);
  } catch (error) {
    return handleApiError(error, { action: "update campaign rules" });
  }
}
