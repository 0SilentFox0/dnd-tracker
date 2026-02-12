import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import {
  calculateAllyHpChangesOnVictory,
  checkVictoryConditions,
} from "@/lib/utils/battle/battle-victory";
import {
  preparePusherPayload,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { executeSkillsByTrigger } from "@/lib/utils/skills/skill-triggers-execution";
import { BattleAction, BattleParticipant } from "@/types/battle";

const isBattleSyncDebugEnabled =
  process.env.BATTLE_SYNC_DEBUG === "1" ||
  process.env.BATTLE_SYNC_DEBUG === "true";

const isTurnTimingEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.BATTLE_TURN_TIMING === "1";

function logTurnTiming(label: string, startMs: number, extra?: Record<string, number>) {
  if (!isTurnTimingEnabled) return;
  const elapsed = Date.now() - startMs;
  console.info("[turn-timing][server]", label, { elapsedMs: elapsed, ...extra });
}

function battleStateSnapshot(
  initiativeOrder: BattleParticipant[],
  currentTurnIndex: number,
  currentRound: number,
  status?: string,
) {
  const current = initiativeOrder[currentTurnIndex]?.basicInfo;

  return {
    status: status ?? null,
    round: currentRound,
    turnIndex: currentTurnIndex,
    initiativeCount: initiativeOrder.length,
    currentParticipantId: current?.id ?? null,
    currentParticipantName: current?.name ?? null,
    currentParticipantSide: current?.side ?? null,
  };
}

function debugBattleSync(message: string, payload?: unknown) {
  if (!isBattleSyncDebugEnabled) return;

  if (payload === undefined) {
    console.info("[battle-sync][next-turn]", message);

    return;
  }

  console.info("[battle-sync][next-turn]", message, payload);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  const t0 = Date.now();

  try {
    const { id, battleId } = await params;

    debugBattleSync("request received", { campaignId: id, battleId });

    const accessResult = await requireCampaignAccess(id, false);
    logTurnTiming("auth + requireCampaignAccess", t0);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { userId } = accessResult;

    const isDM = accessResult.campaign.members[0]?.role === "dm";

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        campaignId: true,
        status: true,
        currentTurnIndex: true,
        currentRound: true,
        initiativeOrder: true,
        pendingSummons: true,
        battleLog: true,
        completedAt: true,
      },
    });
    logTurnTiming("battle fetch", t0);

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

    debugBattleSync("loaded battle", {
      campaignId: id,
      battleId,
      snapshot: battleStateSnapshot(
        initiativeOrder,
        battle.currentTurnIndex,
        battle.currentRound,
        battle.status,
      ),
      battleLogCount:
        (battle.battleLog as unknown as BattleAction[] | undefined)?.length ?? 0,
    });

    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant) {
      return NextResponse.json(
        { error: "Current participant not found" },
        { status: 404 },
      );
    }

    const canAdvanceTurn =
      isDM ||
      currentParticipant.basicInfo.controlledBy === userId;

    if (!canAdvanceTurn) {
      return NextResponse.json(
        { error: "Forbidden: only DM or current turn controller can advance" },
        { status: 403 },
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

    logTurnTiming("while loop (triggers, startOfTurn)", t0, { attempts });

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

    const tBeforeUpdate = Date.now();

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

    logTurnTiming("prisma.update", t0, {
      updateMs: Date.now() - tBeforeUpdate,
      battleLogSize: battleLog.length + newLogEntries.length,
    });

    debugBattleSync("battle updated", {
      campaignId: id,
      battleId,
      snapshot: battleStateSnapshot(
        updatedInitiativeOrder,
        nextTurnIndex,
        nextRound,
        finalStatus,
      ),
      newLogEntries: newLogEntries.length,
      totalBattleLogCount: battleLog.length + newLogEntries.length,
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      const pusherPayload = preparePusherPayload(updatedBattle);

      debugBattleSync("trigger battle-updated", {
        channel: `battle-${battleId}`,
        event: "battle-updated",
      });
      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", pusherPayload)
        .catch((err) => console.error("Pusher trigger failed:", err));

      if (finalStatus === "completed") {
        debugBattleSync("trigger battle-completed", {
          channel: `battle-${battleId}`,
          event: "battle-completed",
        });
        void pusherServer
          .trigger(`battle-${battleId}`, "battle-completed", pusherPayload)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      const activeParticipant = updatedInitiativeOrder[nextTurnIndex];

      if (
        activeParticipant &&
        activeParticipant.basicInfo.controlledBy !== "dm"
      ) {
        debugBattleSync("trigger turn-started", {
          channel: `user-${activeParticipant.basicInfo.controlledBy}`,
          event: "turn-started",
          participantId: activeParticipant.basicInfo.id,
          participantName: activeParticipant.basicInfo.name,
        });
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

    logTurnTiming("total (before response)", t0);

    return NextResponse.json(stripStateBeforeForClient(updatedBattle));
  } catch (error) {
    console.error("Error advancing turn:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
