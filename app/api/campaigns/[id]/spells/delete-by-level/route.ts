import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { deleteSpellsByLevelSchema } from "@/lib/schemas";
import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { parseBody } from "@/lib/utils/api/parse-body";

export const DELETE = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.writeAll, action: "delete spells by level" }, async (actor) => {
    const parsed = await parseBody(deleteSpellsByLevelSchema, req);

    if (parsed instanceof NextResponse) return parsed;

    const result = await prisma.spell.deleteMany({ where: { campaignId: actor.campaignId, level: parsed.level } });

    invalidateReference(ReferenceKind.SPELLS, actor.campaignId);

    return NextResponse.json({ ok: true, deleted: result.count });
  });
