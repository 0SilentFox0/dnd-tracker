import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { loadOwned } from "@/lib/utils/api/load-owned";

export const POST = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.write, action: "remove all spells from group" }, async (actor, p) => {
    const spellGroup = await loadOwned(prisma.spellGroup.findUnique({ where: { id: p.groupId } }), actor.campaignId);

    if (spellGroup instanceof NextResponse) return spellGroup;

    await prisma.spell.updateMany({ where: { campaignId: actor.campaignId, groupId: p.groupId }, data: { groupId: null } });

    invalidateReference(ReferenceKind.SPELLS, actor.campaignId);

    return NextResponse.json({ success: true });
  });
