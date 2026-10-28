import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { importUnitsSchema } from "@/lib/schemas/units";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { parseBody } from "@/lib/utils/api/parse-body";
import { importUnitsIntoCampaign } from "@/lib/utils/units/import-units";

export const POST = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.write, action: "import units" }, async (actor) => {
    const parsed = await parseBody(importUnitsSchema, req);

    if (parsed instanceof NextResponse) return parsed;

    await assertCampaignRefs(actor.campaignId, { spell: parsed.units.flatMap((u) => u.knownSpells) });

    const report = await importUnitsIntoCampaign(prisma, actor.campaignId, parsed.units);

    invalidateReference(ReferenceKind.UNITS, actor.campaignId);

    return NextResponse.json(report);
  });
