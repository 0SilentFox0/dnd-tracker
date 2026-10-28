import { NextResponse } from "next/server";

import { createScenarioPageSchema } from "@/lib/schemas/scenario";
import { runScenarioOperation } from "@/lib/server/scenario/action-service";
import { listPages } from "@/lib/server/scenario/page-store";
import { sessionDmActor } from "@/lib/utils/api/actor";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";



export async function listScenarioHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listPages(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "list scenario pages" });
  }
}

export async function createScenarioHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createScenarioPageSchema, req);

    if (body instanceof NextResponse) return body;

    const result = await runScenarioOperation(sessionDmActor(campaignId, access.userId), "create", { data: body });

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create scenario page" });
  }
}
