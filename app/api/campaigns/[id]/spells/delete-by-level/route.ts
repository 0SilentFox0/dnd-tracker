import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const DELETE = operationRoute(CONTENT_OPERATIONS["spells.delete-by-level"], async ({ actor, body }) => {
  const result = await prisma.spell.deleteMany({ where: { campaignId: actor.campaignId, level: body.level } });

  invalidateReference(ReferenceKind.SPELLS, actor.campaignId);

  return NextResponse.json({ ok: true, deleted: result.count });
});
