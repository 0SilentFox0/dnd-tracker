import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";
import { importUnitsIntoCampaign } from "@/lib/utils/units/import-units";

export const POST = operationRoute(CONTENT_OPERATIONS["units.import"], async ({ actor, body }) => {
  await assertCampaignRefs(actor.campaignId, { spell: body.units.flatMap((u) => u.knownSpells) });

  const report = await importUnitsIntoCampaign(prisma, actor.campaignId, body.units);

  invalidateReference(ReferenceKind.UNITS, actor.campaignId);

  return NextResponse.json(report);
});
