/**
 * Утиліти для перевірки перемоги та завершення бою
 */

import { ParticipantSide } from "@/lib/constants/battle";
import { BattleAction, BattleParticipant } from "@/types/battle";

/**
 * Перевіряє умови перемоги
 * @param initiativeOrder - всі учасники бою
 * @returns результат перевірки
 */
export interface VictoryCheckResult {
  isVictory: boolean;
  isDefeat: boolean;
  result: "victory" | "defeat" | null;
  message: string;
}

export function checkVictoryConditions(
  initiativeOrder: BattleParticipant[]
): VictoryCheckResult {
  // Розділяємо на союзників та ворогів
  const allies = initiativeOrder.filter((p) => p.basicInfo.side === ParticipantSide.ALLY);

  const enemies = initiativeOrder.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY);

  // Перевіряємо чи всі вороги мертві або непритомні
  const allEnemiesDefeated = enemies.every(
    (enemy) => enemy.combatStats.status === "dead" || enemy.combatStats.status === "unconscious"
  );

  // Перевіряємо чи всі союзники мертві або непритомні
  const allAlliesDefeated = allies.every(
    (ally) => ally.combatStats.status === "dead" || ally.combatStats.status === "unconscious"
  );

  if (allEnemiesDefeated && enemies.length > 0) {
    return {
      isVictory: true,
      isDefeat: false,
      result: "victory",
      message: "🎉 Перемога! Всі вороги переможені!",
    };
  }

  if (allAlliesDefeated && allies.length > 0) {
    return {
      isVictory: false,
      isDefeat: true,
      result: "defeat",
      message: "💀 Поразка! Всі союзники переможені!",
    };
  }

  return {
    isVictory: false,
    isDefeat: false,
    result: null,
    message: "",
  };
}

/**
 * Завершує бій та відновлює HP союзників
 * @param initiativeOrder - всі учасники бою
 * @param result - результат бою ("victory" | "defeat")
 * @param currentRound - поточний раунд
 * @returns оновлений список учасників та BattleAction для логу
 */
export function completeBattle(
  initiativeOrder: BattleParticipant[],
  result: "victory" | "defeat",
  currentRound: number
): {
  updatedParticipants: BattleParticipant[];
  battleAction: BattleAction;
} {
  const updatedParticipants = initiativeOrder.map((participant) => {
    // Якщо перемога - відновлюємо HP всіх unconscious союзників
    if (
      result === "victory" &&
      participant.basicInfo.side === ParticipantSide.ALLY &&
      participant.combatStats.status === "unconscious"
    ) {
      return {
        ...participant,
        combatStats: {
          ...participant.combatStats,
          currentHp: participant.combatStats.maxHp,
          status: "active" as const,
        },
      };
    }

    return participant;
  });

  const battleAction: BattleAction = {
    id: `battle-complete-${Date.now()}`,
    battleId: "", // буде встановлено в route
    round: currentRound,
    actionIndex: 0, // буде встановлено в route
    timestamp: new Date(),
    actorId: "system",
    actorName: "Система",
    actorSide: "ally",
    actionType: "end_turn",
    targets: [],
    actionDetails: {},
    resultText:
      result === "victory"
        ? "🎉 Бій завершено! Перемога союзників!"
        : "💀 Бій завершено! Поразка союзників!",
    hpChanges: updatedParticipants
      .filter((p) => p.basicInfo.side === "ally" && p.combatStats.status === "unconscious")
          .map((p) => {
            const oldHp = p.combatStats.currentHp;

            return {
              participantId: p.basicInfo.id,
              participantName: p.basicInfo.name,
              oldHp,
              newHp: p.combatStats.maxHp,
              change: p.combatStats.maxHp - oldHp,
            };
          }),
    isCancelled: false,
  };

  return {
    updatedParticipants,
    battleAction,
  };
}

/**
 * Обчислює зміни HP для союзників після перемоги
 * @param originalInitiativeOrder - оригінальний порядок ініціативи
 * @param updatedInitiativeOrder - оновлений порядок ініціативи
 * @param victoryResult - результат перевірки перемоги
 * @returns масив змін HP для союзників
 */
export function calculateAllyHpChangesOnVictory(
  originalInitiativeOrder: BattleParticipant[],
  updatedInitiativeOrder: BattleParticipant[],
  victoryResult: VictoryCheckResult
): Array<{
  participantId: string;
  participantName: string;
  oldHp: number;
  newHp: number;
  change: number;
}> {
  const originalById = new Map(
    originalInitiativeOrder.map((p) => [p.basicInfo.id, p])
  );

  return updatedInitiativeOrder
    .filter((p) => p.basicInfo.side === ParticipantSide.ALLY)
    .map((p) => {
      const original = originalById.get(p.basicInfo.id);

      const oldHp = original?.combatStats.currentHp ?? p.combatStats.currentHp;

      const newHp = p.combatStats.currentHp;

      if (oldHp !== newHp && victoryResult.result === "victory") {
        return {
          participantId: p.basicInfo.id,
          participantName: p.basicInfo.name,
          oldHp,
          newHp,
          change: newHp - oldHp,
        };
      }

      return null;
    })
    .filter((change): change is NonNullable<typeof change> => change !== null);
}
