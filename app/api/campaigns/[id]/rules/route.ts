import { NextResponse } from "next/server";

import { readCampaignRules, updateCampaignRules } from "@/lib/server/campaigns/rules";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["rules.get"], async ({ actor }) => NextResponse.json(await readCampaignRules(actor.campaignId)));

export const PATCH = operationRoute(CONTENT_OPERATIONS["rules.update"], async ({ actor, body }) => NextResponse.json(await updateCampaignRules(actor.campaignId, body)));
