import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string; battleId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
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
      where: { id: params.battleId },
    });

    if (!battle || battle.campaignId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 }
      );
    }

    const initiativeOrder = battle.initiativeOrder as Array<any>;
    let nextTurnIndex = battle.currentTurnIndex + 1;
    let nextRound = battle.currentRound;

    // Якщо досягли кінця черги, переходимо до наступного раунду
    if (nextTurnIndex >= initiativeOrder.length) {
      nextTurnIndex = 0;
      nextRound += 1;
    }

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: params.battleId },
      data: {
        currentTurnIndex: nextTurnIndex,
        currentRound: nextRound,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger(
        `battle-${params.battleId}`,
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
