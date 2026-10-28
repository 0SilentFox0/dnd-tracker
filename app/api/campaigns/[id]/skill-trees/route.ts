import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["skill-trees.list"], async ({ actor }) => NextResponse.json(await prisma.skillTree.findMany({ where: { campaignId: actor.campaignId } })));
