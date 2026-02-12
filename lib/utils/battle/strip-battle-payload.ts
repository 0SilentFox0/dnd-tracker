/**
 * Утиліти для зменшення payload бою перед відправкою клієнту.
 * stateBefore використовується тільки на сервері для rollback — клієнт його не потребує.
 */

import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

const PUSHER_SIZE_LIMIT_BYTES = 10_240;

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
