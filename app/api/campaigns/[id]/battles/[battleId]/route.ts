import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  requireCampaignAccess,
  requireDM,
} from "@/lib/utils/api/api-auth";
import { stripStateBeforeForClient } from "@/lib/utils/battle/strip-battle-payload";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      include: {
        campaign: {
          select: { id: true, friendlyFire: true },
        },
      },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userRole = accessResult.campaign.members[0]?.role || "player";

    const isDM = userRole === "dm";

    const payload = stripStateBeforeForClient({
      ...battle,
      campaign: {
        id: battle.campaign.id,
        friendlyFire: battle.campaign.friendlyFire || false,
      },
      userRole,
      isDM,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: body,
    });

    return NextResponse.json(stripStateBeforeForClient(updatedBattle));
  } catch (error) {
    console.error("Error updating battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.battleScene.delete({
      where: { id: battleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
