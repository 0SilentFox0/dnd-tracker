/**
 * Утиліти для зменшення payload бою перед відправкою клієнту.
 * stateBefore використовується тільки на сервері для rollback — клієнт його не потребує.
 */

import type { BattleScene } from "@/types/api";
import type { ActiveEffect, BattleAction, BattleParticipant } from "@/types/battle";

const PUSHER_SIZE_LIMIT_BYTES = 32_768; // 32KB — збільшено для зменшення light payload refetch

/** Кількість останніх записів battleLog, для яких зберігаємо stateBefore (для rollback) */
const STATE_BEFORE_KEEP_LAST_N = 5;

/**
 * Зменшує розмір initiativeOrder перед записом у БД.
 * - activeEffects: appliedAt зберігає лише round (без timestamp)
 * - activeEffects: видаляє description, icon (не потрібні для battle logic)
 */
export function slimInitiativeOrderForStorage(
  initiativeOrder: BattleParticipant[],
): BattleParticipant[] {
  if (!Array.isArray(initiativeOrder) || initiativeOrder.length === 0) {
    return initiativeOrder;
  }

  return initiativeOrder.map((p) => {
    const effects = p.battleData?.activeEffects;
    if (!effects || effects.length === 0) {
      return p;
    }

    const slimEffects = effects.map((e) => {
      const { appliedAt, description, icon, ...rest } = e;
      const round = appliedAt && typeof appliedAt === "object" && "round" in appliedAt
        ? (appliedAt as { round: number }).round
        : 1;
      return {
        ...rest,
        appliedAt: { round },
      } as ActiveEffect;
    });

    return {
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: slimEffects,
      },
    };
  });
}

/**
 * Видаляє stateBefore з усіх записів battleLog, крім останніх N (для rollback).
 * Зменшує розмір JSONB в БД.
 */
export function stripStateBeforeForStorage(
  battleLog: BattleAction[],
  keepLastN: number = STATE_BEFORE_KEEP_LAST_N,
): BattleAction[] {
  if (!Array.isArray(battleLog) || battleLog.length === 0) return battleLog;

  const cutoff = Math.max(0, battleLog.length - keepLastN);

  return battleLog.map((entry, i) => {
    if (i < cutoff && entry && typeof entry === "object" && "stateBefore" in entry) {
      const { stateBefore: _, ...rest } = entry as BattleAction & { stateBefore?: unknown };
      return rest;
    }
    return entry;
  });
}

/**
 * Видаляє stateBefore з кожного запису battleLog.
 * Клієнт не використовує stateBefore — rollback робиться на сервері через actionIndex.
 * При status "active" або "completed" не включає participants — достатньо initiativeOrder.
 */
export function stripStateBeforeForClient<
  T extends { battleLog?: unknown; participants?: unknown; status?: string },
>(battle: T): T {
  const log = battle.battleLog;

  const strippedLog =
    log && Array.isArray(log)
      ? log.map((entry) => {
          if (entry && typeof entry === "object" && "stateBefore" in entry) {
            const { stateBefore: _, ...rest } = entry as BattleAction & {
              stateBefore?: unknown;
            };

            return rest;
          }

          return entry;
        })
      : battle.battleLog;

  const omitParticipants =
    battle.status === "active" || battle.status === "completed";

  return {
    ...battle,
    battleLog: strippedLog,
    ...(omitParticipants && { participants: [] as unknown[] }),
  };
}

/**
 * Підготовлює payload для Pusher.
 * Якщо після strip розмір > 10KB, повертає легкий event — клієнт зробить refetch.
 */
export function preparePusherPayload(
  battle: { id: string; battleLog?: unknown; participants?: unknown; status?: string },
):
  | BattleScene
  | { type: "battle-updated"; battleId: string } {
  const stripped = stripStateBeforeForClient(
    battle as Parameters<typeof stripStateBeforeForClient>[0],
  );

  const json = JSON.stringify(stripped);

  const sizeBytes = new TextEncoder().encode(json).length;

  if (sizeBytes <= PUSHER_SIZE_LIMIT_BYTES) {
    return stripped as BattleScene;
  }

  return { type: "battle-updated", battleId: battle.id };
}
