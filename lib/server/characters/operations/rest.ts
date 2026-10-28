import { NextResponse } from "next/server";

import { guardedCharacterHandler, operationDM } from "../operation-context";

import { restParty } from "@/app/api/campaigns/[id]/rest/rest-handler";
import { restSchema } from "@/lib/schemas/out-of-combat";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CampaignRouteContext } from "@/types/api";

async function POSTImpl(request: Request, { params }: CampaignRouteContext, actor?: Actor) {
  try {
    const { id } = await params;

    const access = await operationDM(id, actor);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(restSchema, request);

    if (body instanceof NextResponse) return body;

    return await restParty(access, body);
  } catch (error) {
    return handleApiError(error, { action: "rest party" });
  }
}

export const POST = guardedCharacterHandler(POSTImpl, "rest");
