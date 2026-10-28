import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { bundleErrorResponse } from "@/lib/utils/api/bundle-error";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";

export const GET = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.read("dm"), action: "export campaign" }, async (actor) => {
    try {
      const bundle = await exportCampaign(prisma, actor.campaignId);

      const date = new Date().toISOString().slice(0, 10);

      return NextResponse.json(bundle, {
        headers: { ...PRIVATE_NO_STORE_HEADERS, "Content-Disposition": `attachment; filename="campaign-${actor.campaignId}-${date}.json"` },
      });
    } catch (error) {
      const response = bundleErrorResponse(error);

      if (response) return response;

      throw error;
    }
  });
