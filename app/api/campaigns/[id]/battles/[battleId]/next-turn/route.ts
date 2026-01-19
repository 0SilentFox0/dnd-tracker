import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { BattleParticipant } from "@/lib/types/battle";

export async function POST(
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

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 }
      );
    }

    const initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];
    let nextTurnIndex = battle.currentTurnIndex + 1;
    let nextRound = battle.currentRound;

    // Якщо досягли кінця черги, переходимо до наступного раунду
    if (nextTurnIndex >= initiativeOrder.length) {
      nextTurnIndex = 0;
      nextRound += 1;
    }

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        currentTurnIndex: nextTurnIndex,
        currentRound: nextRound,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-updated",
        updatedBattle
      );
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error advancing turn:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
