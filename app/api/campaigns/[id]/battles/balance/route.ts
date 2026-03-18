import { NextResponse } from "next/server";
import { z } from "zod";

import { getBalancePayload } from "./balance-get";
import { postBalanceResponse } from "./balance-post";
import { balanceSchema } from "./balance-schema";

import { requireDM } from "@/lib/utils/api/api-auth";

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
    console.error("Balance entity-stats GET error:", e);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }

    console.error("Balance API error:", e);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
