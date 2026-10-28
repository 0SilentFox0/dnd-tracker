import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { operationRoute } from "@/lib/utils/api/content-routes";
import { loadOwned } from "@/lib/utils/api/load-owned";

export const POST = operationRoute(CONTENT_OPERATIONS["spell-groups.remove-all-spells"], async ({ actor, params: p }) => withCampaignContentWrite(actor.campaignId, async () => {
  const spellGroup = await loadOwned(prisma.spellGroup.findUnique({ where: { id: p.groupId } }), actor.campaignId);

  if (spellGroup instanceof NextResponse) return spellGroup;

  await prisma.spell.updateMany({ where: { campaignId: actor.campaignId, groupId: p.groupId }, data: { groupId: null } });

  afterContentCommit(() => invalidateReference(ReferenceKind.SPELLS, actor.campaignId));

  return NextResponse.json({ ok: true });
}));
