import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import {
  preparePusherPayload,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";

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
      const { pusherServer, battleChannelName } = await import("@/lib/pusher");

      const { safePusherTrigger } = await import(
        "@/lib/utils/pusher/safe-trigger"
      );

      safePusherTrigger(
        pusherServer,
        battleChannelName(battleId),
        "battle-updated",
        preparePusherPayload(updatedBattle),
        { action: "reset battle", battleId },
      );
    }

    return NextResponse.json(stripStateBeforeForClient(updatedBattle));
  } catch (error) {
    return handleApiError(error, { action: "reset battle" });
  }
}
