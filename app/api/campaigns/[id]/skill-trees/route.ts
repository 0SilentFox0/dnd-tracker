import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/api/api-auth";

/**
 * GET /api/campaigns/[id]/skill-trees
 * Повертає список дерев прокачки кампанії (для вибору дерева за расою персонажа).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const skillTrees = await prisma.skillTree.findMany({
      where: { campaignId: id },
    });

    return NextResponse.json(skillTrees);
  } catch (error) {
    console.error("Error fetching skill trees:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
