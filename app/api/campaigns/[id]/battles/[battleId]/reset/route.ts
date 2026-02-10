import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";

export async function POST(
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

    // Оновлюємо бій: скидаємо до стану підготовки, щоб можна було почати заново
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "prepared",
        currentRound: 1,
        currentTurnIndex: 0,
        battleLog: [] as unknown as Prisma.InputJsonValue,
        initiativeOrder: [] as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error resetting battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
