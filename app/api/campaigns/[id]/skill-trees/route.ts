import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { resolveActor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const actor = await resolveActor(req, id, { access: "member" });

    if (actor instanceof NextResponse) return actor;

    return NextResponse.json(await prisma.skillTree.findMany({ where: { campaignId: id } }));
  } catch (error) {
    return handleApiError(error, { action: "list skill trees" });
  }
}
