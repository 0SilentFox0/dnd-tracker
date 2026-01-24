import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import {
  calculateAllyHpChangesOnVictory,
  checkVictoryConditions,
} from "@/lib/utils/battle/battle-victory";
import { BattleAction,BattleParticipant } from "@/types/battle";

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
      currentParticipant.actionFlags.hasExtraTurn
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

      // Додаємо повідомлення про тригери startRound в лог (якщо є)
      // Це буде додано до логу пізніше разом з іншими записами
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
          actorId: turnResult.participant.basicInfo.id,
          actorName: turnResult.participant.basicInfo.name,
          actorSide: turnResult.participant.basicInfo.side,
          actionType: "end_turn",
          targets: [],
          actionDetails: {
            damageRolls: turnResult.damageMessages.map(() => ({
              dice: "DOT",
              results: [],
              total: 0,
              damageType: "dot",
            })),
          },
          resultText: turnResult.damageMessages.join("; "),
          hpChanges: [
            {
              participantId: turnResult.participant.basicInfo.id,
              participantName: turnResult.participant.basicInfo.name,
              oldHp: nextParticipant.combatStats.currentHp,
              newHp: turnResult.participant.combatStats.currentHp,
              change: turnResult.participant.combatStats.currentHp - nextParticipant.combatStats.currentHp,
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
          actorId: turnResult.participant.basicInfo.id,
          actorName: turnResult.participant.basicInfo.name,
          actorSide: turnResult.participant.basicInfo.side,
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
              participant.basicInfo.side === ParticipantSide.ALLY &&
              participant.combatStats.status === "unconscious"
            ) {
              return {
                ...participant,
                combatStats: {
                  ...participant.combatStats,
                  currentHp: participant.combatStats.maxHp,
                  status: "active",
                },
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
          hpChanges: calculateAllyHpChangesOnVictory(
            initiativeOrder,
            updatedInitiativeOrder,
            victoryCheck
          ),
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
        if (turnResult.participant.basicInfo.controlledBy !== "dm") {
          await pusherServer.trigger(
            `user-${turnResult.participant.basicInfo.controlledBy}`,
            "turn-started",
            {
              battleId,
              participantId: turnResult.participant.basicInfo.id,
              participantName: turnResult.participant.basicInfo.name,
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
