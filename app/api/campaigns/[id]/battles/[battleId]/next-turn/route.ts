import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import { executeSkillsByTrigger } from "@/lib/utils/skills/skill-triggers-execution";
import {
  calculateAllyHpChangesOnVictory,
  checkVictoryConditions,
} from "@/lib/utils/battle/battle-victory";
import { BattleAction, BattleParticipant } from "@/types/battle";

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

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant) {
      return NextResponse.json(
        { error: "Current participant not found" },
        { status: 404 },
      );
    }

    // Цикл для знаходження наступного живого учасника
    // (адже учасник може померти від DOT ефектів на початку свого ходу)
    let activeParticipantFound = false;

    let attempts = 0;

    const maxAttempts = initiativeOrder.length * 2; // Запобіжник від нескінченного циклу

    let updatedInitiativeOrder = [...initiativeOrder];

    let nextTurnIndex = battle.currentTurnIndex;

    let nextRound = battle.currentRound;

    const stateBeforeNextTurn = {
      initiativeOrder: JSON.parse(
        JSON.stringify(initiativeOrder),
      ) as BattleParticipant[],
      currentTurnIndex: battle.currentTurnIndex,
      currentRound: battle.currentRound,
    };

    // Масив для накопичення логів з усіх пропущених ходів
    const newLogEntries: BattleAction[] = [];

    // Зберігаємо stateBefore лише в першому записі батча, щоб не дублювати великий JSON
    let stateBeforeAddedToBatch = false;
    const getStateBeforeForEntry = () => {
      if (stateBeforeAddedToBatch) return undefined;
      stateBeforeAddedToBatch = true;
      return stateBeforeNextTurn;
    };

    // BattleLog для розрахунку індексів
    const currentBattleLogLength = (
      battle.battleLog as unknown as BattleAction[]
    ).length;

    let clearedPendingSummons = false;

    while (!activeParticipantFound && attempts < maxAttempts) {
      attempts++;

      // 1. Знаходимо наступного кандидата
      const turnTransition = processEndOfTurn(
        nextTurnIndex,
        updatedInitiativeOrder,
        nextRound,
      );

      const previousRound = nextRound;

      nextTurnIndex = turnTransition.nextTurnIndex;
      nextRound = turnTransition.nextRound;

      // 2. Якщо почався новий раунд — спочатку endRound тригери, потім start of round
      if (nextRound > previousRound) {
        // Тригери endRound для всіх учасників (раунд що завершився = previousRound)
        const afterEndRound = updatedInitiativeOrder.map((participant) => {
          const result = executeSkillsByTrigger(
            participant,
            "endRound",
            updatedInitiativeOrder,
            { currentRound: previousRound },
          );
          return result.participant;
        });
        updatedInitiativeOrder = afterEndRound;

        const pendingSummons =
          (battle.pendingSummons as unknown as BattleParticipant[]) ?? [];

        clearedPendingSummons = true;

        const roundResult = processStartOfRound(
          updatedInitiativeOrder,
          nextRound,
          pendingSummons,
        );

        updatedInitiativeOrder = roundResult.updatedInitiativeOrder;

        // Запис у лог бою: спрацювання тригерів початку раунду
        if (roundResult.triggerMessages.length > 0) {
          newLogEntries.push({
            id: `triggers-round-${nextRound}-${Date.now()}-${attempts}`,
            battleId,
            round: nextRound,
            actionIndex: currentBattleLogLength + newLogEntries.length,
            timestamp: new Date(),
            actorId: "system",
            actorName: "Система",
            actorSide: "ally",
            actionType: "ability",
            targets: [],
            actionDetails: {},
            resultText: `Тригери початку раунду ${nextRound}: ${roundResult.triggerMessages.join("; ")}`,
            hpChanges: [],
            isCancelled: false,
            stateBefore: getStateBeforeForEntry(),
          });
        }
      }

      // 3. Обробляємо початок ходу кандидата
      const nextParticipant = updatedInitiativeOrder[nextTurnIndex];

      if (!nextParticipant) {
        break; // Щось пішло не так
      }

      const turnResult = processStartOfTurn(
        nextParticipant,
        nextRound,
        updatedInitiativeOrder,
      );

      // Оновлюємо учасника в масиві
      updatedInitiativeOrder[nextTurnIndex] = turnResult.participant;

      // 4. Створюємо логи для цього кроку (DOT, ефекти)
      if (turnResult.damageMessages.length > 0) {
        newLogEntries.push({
          id: `turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
          battleId,
          round: nextRound,
          actionIndex: currentBattleLogLength + newLogEntries.length,
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
              change:
                turnResult.participant.combatStats.currentHp -
                nextParticipant.combatStats.currentHp,
            },
          ],
          isCancelled: false,
          stateBefore: getStateBeforeForEntry(),
        });
      }

      if (turnResult.expiredEffects.length > 0) {
        newLogEntries.push({
          id: `effects-${nextTurnIndex}-${Date.now()}-${attempts}`,
          battleId,
          round: nextRound,
          actionIndex: currentBattleLogLength + newLogEntries.length,
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
          stateBefore: getStateBeforeForEntry(),
        });
      }

      if (turnResult.triggeredAbilities.length > 0) {
        newLogEntries.push({
          id: `triggers-turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
          battleId,
          round: nextRound,
          actionIndex: currentBattleLogLength + newLogEntries.length,
          timestamp: new Date(),
          actorId: turnResult.participant.basicInfo.id,
          actorName: turnResult.participant.basicInfo.name,
          actorSide: turnResult.participant.basicInfo.side,
          actionType: "ability",
          targets: [],
          actionDetails: {
            triggeredAbilities: turnResult.triggeredAbilities.map((name) => ({
              id: name,
              name,
            })),
          },
          resultText: `Тригери початку ходу: ${turnResult.triggeredAbilities.join(", ")}`,
          hpChanges: [],
          isCancelled: false,
          stateBefore: getStateBeforeForEntry(),
        });
      }

      // 5. Перевіряємо чи учасник живий і при свідомості
      const isAlive =
        turnResult.participant.combatStats.status !== "dead" &&
        turnResult.participant.combatStats.status !== "unconscious";

      if (isAlive) {
        activeParticipantFound = true;
      } else {
        // Якщо помер/знепритомнів на початку ходу - цикл продовжиться і знайде наступного
        // Але ми вже записали логи урону, тож гравці побачать що сталося
      }

      // Перевіряємо умови перемоги на кожному кроці (раптом всі померли від DOT)
      const victoryCheck = checkVictoryConditions(updatedInitiativeOrder);

      if (victoryCheck.result && battle.status === "active") {
        // Якщо перемога - виходимо з циклу обробки ходів і переходимо до завершення бою
        // Але треба зберегти поточний стейт
        break;
      }
    }

    // Після циклу формуємо фінальний апдейт
    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    // Перевіряємо умови перемоги фінально
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
        actionIndex: currentBattleLogLength + newLogEntries.length,
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
          victoryCheck,
        ),
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      };

      newLogEntries.push(completionAction);
    }

    // Оновлюємо бій (очищаємо pendingSummons після обробки початку раунду)
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        currentTurnIndex: nextTurnIndex,
        currentRound: nextRound,
        status: finalStatus,
        completedAt: completedAt || undefined,
        initiativeOrder:
          updatedInitiativeOrder as unknown as Prisma.InputJsonValue,
        pendingSummons: clearedPendingSummons
          ? ([] as unknown as Prisma.InputJsonValue)
          : (battle.pendingSummons as Prisma.InputJsonValue) ?? [],
        battleLog: [
          ...battleLog,
          ...newLogEntries,
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));

      if (finalStatus === "completed") {
        void pusherServer
          .trigger(`battle-${battleId}`, "battle-completed", updatedBattle)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      const activeParticipant = updatedInitiativeOrder[nextTurnIndex];
      if (
        activeParticipant &&
        activeParticipant.basicInfo.controlledBy !== "dm"
      ) {
        void pusherServer
          .trigger(
            `user-${activeParticipant.basicInfo.controlledBy}`,
            "turn-started",
            {
              battleId,
              participantId: activeParticipant.basicInfo.id,
              participantName: activeParticipant.basicInfo.name,
            },
          )
          .catch((err) => console.error("Pusher trigger failed:", err));
      }
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error advancing turn:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
