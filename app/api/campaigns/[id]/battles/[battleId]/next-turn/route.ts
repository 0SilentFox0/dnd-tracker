import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { BattleParticipant, BattleAction } from "@/types/battle";
import { Prisma } from "@prisma/client";
import {
  processStartOfTurn,
  processEndOfTurn,
  processStartOfRound,
} from "@/lib/utils/battle-turn";
import { checkVictoryConditions } from "@/lib/utils/battle-victory";

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

    let initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];
    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant) {
      return NextResponse.json(
        { error: "Current participant not found" },
        { status: 404 }
      );
    }

    // Обробляємо завершення ходу та перехід до наступного
    const { nextTurnIndex, nextRound } = processEndOfTurn(
      battle.currentTurnIndex,
      initiativeOrder,
      battle.currentRound,
      currentParticipant.hasExtraTurn
    );

    // Якщо почався новий раунд, обробляємо start of round
    let updatedInitiativeOrder = initiativeOrder;
    
    if (nextRound > battle.currentRound) {
      // TODO: Додати pendingSummons в схему BattleScene
      const pendingSummons: BattleParticipant[] = [];
      const roundResult = processStartOfRound(
        initiativeOrder,
        nextRound,
        pendingSummons
      );
      updatedInitiativeOrder = roundResult.updatedInitiativeOrder;
    }

    // Обробляємо початок ходу нового учасника
    const nextParticipant = updatedInitiativeOrder[nextTurnIndex];
    if (nextParticipant) {
      const turnResult = processStartOfTurn(
        nextParticipant,
        nextRound,
        updatedInitiativeOrder
      );

      // Оновлюємо учасника в initiativeOrder
      updatedInitiativeOrder[nextTurnIndex] = turnResult.participant;

      // Створюємо BattleAction для логу (якщо є зміни)
      const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];
      const newLogEntries: BattleAction[] = [];

      if (turnResult.damageMessages.length > 0) {
        newLogEntries.push({
          id: `turn-${nextTurnIndex}-${Date.now()}`,
          battleId,
          round: nextRound,
          actionIndex: battleLog.length,
          timestamp: new Date(),
          actorId: turnResult.participant.id,
          actorName: turnResult.participant.name,
          actorSide: turnResult.participant.side,
          actionType: "end_turn",
          targets: [],
          actionDetails: {
            damageRolls: turnResult.damageMessages.map((msg, idx) => ({
              dice: "DOT",
              results: [],
              total: 0,
              damageType: "dot",
            })),
          },
          resultText: turnResult.damageMessages.join("; "),
          hpChanges: [
            {
              participantId: turnResult.participant.id,
              participantName: turnResult.participant.name,
              oldHp: nextParticipant.currentHp,
              newHp: turnResult.participant.currentHp,
              change: turnResult.participant.currentHp - nextParticipant.currentHp,
            },
          ],
          isCancelled: false,
        });
      }

      if (turnResult.expiredEffects.length > 0) {
        newLogEntries.push({
          id: `effects-${nextTurnIndex}-${Date.now()}`,
          battleId,
          round: nextRound,
          actionIndex: battleLog.length + newLogEntries.length,
          timestamp: new Date(),
          actorId: turnResult.participant.id,
          actorName: turnResult.participant.name,
          actorSide: turnResult.participant.side,
          actionType: "ability",
          targets: [],
          actionDetails: {
            appliedEffects: turnResult.expiredEffects.map((name) => ({
              id: name,
              name,
              duration: 0,
            })),
          },
          resultText: `Ефекти завершилися: ${turnResult.expiredEffects.join(", ")}`,
          hpChanges: [],
          isCancelled: false,
        });
      }

      // Перевіряємо умови перемоги після оновлення
      const victoryCheck = checkVictoryConditions(updatedInitiativeOrder);
      let finalStatus = battle.status;
      let completedAt = battle.completedAt;

      // Якщо умови перемоги виконані - автоматично завершуємо бій
      if (victoryCheck.result && battle.status === "active") {
        finalStatus = "completed";
        completedAt = new Date();

        // Відновлюємо HP unconscious союзників при перемозі
        if (victoryCheck.result === "victory") {
          updatedInitiativeOrder = updatedInitiativeOrder.map((participant) => {
            if (
              participant.side === "ally" &&
              participant.status === "unconscious"
            ) {
              return {
                ...participant,
                currentHp: participant.maxHp,
                status: "active",
              };
            }
            return participant;
          });
        }

        // Додаємо BattleAction про завершення бою
        const completionAction: BattleAction = {
          id: `battle-complete-${Date.now()}`,
          battleId,
          round: nextRound,
          actionIndex: battleLog.length + newLogEntries.length,
          timestamp: new Date(),
          actorId: "system",
          actorName: "Система",
          actorSide: "ally",
          actionType: "end_turn",
          targets: [],
          actionDetails: {},
          resultText: victoryCheck.message,
          hpChanges: updatedInitiativeOrder
            .filter((p) => p.side === "ally")
            .map((p) => {
              // Знаходимо оригінального учасника для отримання oldHp
              const original = initiativeOrder.find((orig) => orig.id === p.id);
              const oldHp = original?.currentHp || p.currentHp;
              const newHp = p.currentHp;
              
              // Додаємо тільки якщо була зміна HP
              if (oldHp !== newHp && victoryCheck.result === "victory") {
                return {
                  participantId: p.id,
                  participantName: p.name,
                  oldHp,
                  newHp,
                  change: newHp - oldHp,
                };
              }
              return null;
            })
            .filter((change): change is NonNullable<typeof change> => change !== null),
          isCancelled: false,
        };

        newLogEntries.push(completionAction);
      }

      // Оновлюємо бій
      const updatedBattle = await prisma.battleScene.update({
        where: { id: battleId },
        data: {
          currentTurnIndex: nextTurnIndex,
          currentRound: nextRound,
          status: finalStatus,
          completedAt: completedAt || undefined,
          initiativeOrder: updatedInitiativeOrder as unknown as Prisma.InputJsonValue,
          battleLog: [
            ...battleLog,
            ...newLogEntries,
          ] as unknown as Prisma.InputJsonValue,
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

        // Якщо бій завершено
        if (finalStatus === "completed") {
          await pusherServer.trigger(
            `battle-${battleId}`,
            "battle-completed",
            updatedBattle
          );
        }
        
        // Відправляємо notification активному гравцю про початок ходу
        if (turnResult.participant.controlledBy !== "dm") {
          await pusherServer.trigger(
            `user-${turnResult.participant.controlledBy}`,
            "turn-started",
            {
              battleId,
              participantId: turnResult.participant.id,
              participantName: turnResult.participant.name,
            }
          );
        }
      }

      return NextResponse.json(updatedBattle);
    }

    // Якщо немає наступного учасника (не повинно статися, але для безпеки)
    return NextResponse.json(
      { error: "No next participant found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error advancing turn:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
