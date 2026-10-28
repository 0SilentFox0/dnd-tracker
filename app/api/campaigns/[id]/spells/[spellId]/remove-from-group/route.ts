import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";
import { loadOwned } from "@/lib/utils/api/load-owned";

export const POST = operationRoute(CONTENT_OPERATIONS["spells.remove-from-group"], async ({ actor, params: p }) => {
  const spell = await loadOwned(prisma.spell.findUnique({ where: { id: p.spellId } }), actor.campaignId);

  if (spell instanceof NextResponse) return spell;

  const updatedSpell = await prisma.spell.update({ where: { id: p.spellId }, data: { groupId: null }, include: { spellGroup: true } });

  invalidateReference(ReferenceKind.SPELLS, actor.campaignId);

  return NextResponse.json(updatedSpell);
});
