import { NextResponse } from "next/server";

import { getBalancePayload } from "./balance-get";
import { postBalanceResponse } from "./balance-post";
import { balanceSchema } from "./balance-schema";

import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** GET: DPR, HP, KPI для кожного персонажа та юніта кампанії. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) return accessResult;

    const payload = await getBalancePayload(campaignId);

    return NextResponse.json(payload);
  } catch (e) {
    return handleApiError(e, { action: "balance: GET entity stats" });
  }
}

/** POST: поради по ворогах за складністю та учасниках. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) return accessResult;

    const body = await request.json();

    const data = balanceSchema.parse(body);

    const response = await postBalanceResponse(campaignId, data);

    return NextResponse.json(response);
  } catch (e) {
    return handleApiError(e, { action: "balance: POST recommendations" });
  }
}
