/**
 * Утиліти для перевірки перемоги та завершення бою
 */

import { BattleParticipant, BattleAction } from "@/types/battle";

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
  const allies = initiativeOrder.filter((p) => p.side === "ally");
  const enemies = initiativeOrder.filter((p) => p.side === "enemy");

  // Перевіряємо чи всі вороги мертві або непритомні
  const allEnemiesDefeated = enemies.every(
    (enemy) => enemy.status === "dead" || enemy.status === "unconscious"
  );

  // Перевіряємо чи всі союзники мертві або непритомні
  const allAlliesDefeated = allies.every(
    (ally) => ally.status === "dead" || ally.status === "unconscious"
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
      participant.side === "ally" &&
      participant.status === "unconscious"
    ) {
      return {
        ...participant,
        currentHp: participant.maxHp,
        status: "active" as const,
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
      .filter((p) => p.side === "ally" && p.status === "unconscious")
          .map((p) => {
            const oldHp = p.currentHp;
            return {
              participantId: p.id,
              participantName: p.name,
              oldHp,
              newHp: p.maxHp,
              change: p.maxHp - oldHp,
            };
          }),
    isCancelled: false,
  };

  return {
    updatedParticipants,
    battleAction,
  };
}
