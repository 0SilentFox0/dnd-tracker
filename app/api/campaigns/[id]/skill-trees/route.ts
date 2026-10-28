import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";

export const GET = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.read("member"), action: "list skill trees" }, async (actor) => NextResponse.json(await prisma.skillTree.findMany({ where: { campaignId: actor.campaignId } })));
