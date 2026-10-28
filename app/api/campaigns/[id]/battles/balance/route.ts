import { NextResponse } from "next/server";

import { balanceSchema } from "./balance-schema";

import { battleBalance } from "@/lib/server/battles/action-service";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

/** GET: DPR, HP, KPI для кожного персонажа та юніта кампанії. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) return accessResult;

    const payload = await battleBalance(campaignId, undefined, accessResult.campaign.rules);

    return NextResponse.json(payload);
  } catch (e) {
    return handleApiError(e, { action: "balance: GET entity stats" });
  }
}

/** POST: сила союзників і (за `suggest`) підібраний склад ворогів. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) return accessResult;

    const data = await parseBody(balanceSchema, request);

    if (data instanceof NextResponse) return data;

    const response = await battleBalance(campaignId, data, accessResult.campaign.rules);

    return NextResponse.json(response);
  } catch (e) {
    return handleApiError(e, { action: "balance: POST recommendations" });
  }
}
