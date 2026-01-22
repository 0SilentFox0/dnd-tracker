import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
) {
  try {
    const { id, battleId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      include: {
        campaign: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Перевіряємо права доступу
    if (battle.campaign.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userRole = battle.campaign.members[0]?.role || "player";
    const isDM = userRole === "dm";

    // Повертаємо битву з додатковою інформацією про кампанію та роль користувача
    return NextResponse.json({
      ...battle,
      campaign: {
        id: battle.campaign.id,
        friendlyFire: battle.campaign.friendlyFire || false,
      },
      userRole,
      isDM,
    });
  } catch (error) {
    console.error("Error fetching battle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
) {
  try {
    const { id, battleId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error updating battle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
