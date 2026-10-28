import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { readCampaignRules, updateCampaignRules } from "@/lib/server/campaigns/rules";
import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { parseBody } from "@/lib/utils/api/parse-body";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export const GET = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.read("member"), action: "get campaign rules" }, async (actor) => NextResponse.json(await readCampaignRules(actor.campaignId)));

export const PATCH = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.write, action: "update campaign rules" }, async (actor) => {
    const patch = await parseBody(RulesetPatchSchema, req, API_ERRORS.INVALID_RULES);

    if (patch instanceof NextResponse) return patch;

    return NextResponse.json(await updateCampaignRules(actor.campaignId, patch));
  });
