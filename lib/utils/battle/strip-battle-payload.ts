/**
 * Утиліти для зменшення payload бою перед відправкою клієнту.
 * stateBefore використовується тільки на сервері для rollback — клієнт його не потребує.
 */

import type { BattleScene } from "@/types/api";
import type { ActiveEffect, BattleAction, BattleParticipant } from "@/types/battle";

const PUSHER_SIZE_LIMIT_BYTES = 32_768; // 32KB — збільшено для зменшення light payload refetch

/** Кількість останніх записів battleLog, для яких зберігаємо stateBefore (для rollback) */
const STATE_BEFORE_KEEP_LAST_N = 1;

/**
 * Зменшує розмір initiativeOrder перед записом у БД.
 * - activeEffects: appliedAt зберігає лише round (без timestamp)
 * - activeEffects: видаляє description (icon зберігаємо для UI)
 * - activeSkills: видаляє description, icon
 * - passiveAbilities: видаляє description
 * - racialAbilities: залишає мінімальний effect
 * - equippedArtifacts: залишає artifactId, modifiers, bonuses (без name, slot, passiveAbility)
 */
export function slimInitiativeOrderForStorage(
  initiativeOrder: BattleParticipant[],
): BattleParticipant[] {
  if (!Array.isArray(initiativeOrder) || initiativeOrder.length === 0) {
    return initiativeOrder;
  }

  return initiativeOrder.map((p) => {
    const bd = p.battleData;

    if (!bd) return p;

    const updates: Partial<typeof bd> = {};

    // activeEffects: slim appliedAt, remove description (keep icon for UI)
    const effects = bd.activeEffects;

    if (effects && effects.length > 0) {
      updates.activeEffects = effects.map((e) => {
        const { appliedAt, description: _description, ...rest } = e;

        void _description;

        const round =
          appliedAt && typeof appliedAt === "object" && "round" in appliedAt
            ? (appliedAt as { round: number }).round
            : 1;

        return { ...rest, appliedAt: { round } } as ActiveEffect;
      });
    }

    // activeSkills: keep icon and description for UI (bonus action picker, effect display)

    // passiveAbilities: remove description (keep empty string for type)
    const passives = bd.passiveAbilities;

    if (passives && passives.length > 0) {
      updates.passiveAbilities = passives.map((pa) => {
        const { description: _desc, ...rest } = pa;

        void _desc;

        return { ...rest, description: "" };
      });
    }

    // racialAbilities: remove description/long text from effect if present
    const racials = bd.racialAbilities;

    if (racials && racials.length > 0) {
      updates.racialAbilities = racials.map((ra) => {
        const effect = ra.effect;

        if (effect && typeof effect === "object") {
          const { description: _desc, ...rest } = effect as Record<string, unknown> & {
            description?: string;
          };

          void _desc;

          return { id: ra.id, name: ra.name, effect: rest };
        }

        return ra;
      });
    }

    // equippedArtifacts: keep artifactId, modifiers, bonuses; strip name, slot, passiveAbility
    const artifacts = bd.equippedArtifacts;

    if (artifacts && artifacts.length > 0) {
      updates.equippedArtifacts = artifacts.map((a) => ({
        artifactId: a.artifactId,
        name: "",
        slot: a.slot ?? "",
        modifiers: a.modifiers ?? [],
        bonuses: a.bonuses ?? {},
      }));
    }

    if (Object.keys(updates).length === 0) return p;

    return {
      ...p,
      battleData: { ...bd, ...updates },
    };
  });
}

/**
 * Видаляє actionDetails.damageBreakdown з записів battleLog (не потрібен для rollback).
 * Зменшує розмір JSONB в БД.
 */
export function slimBattleLogForStorage(battleLog: BattleAction[]): BattleAction[] {
  if (!Array.isArray(battleLog) || battleLog.length === 0) return battleLog;

  return battleLog.map((entry) => {
    if (!entry || typeof entry !== "object" || !("actionDetails" in entry)) {
      return entry;
    }

    const details = (entry as BattleAction).actionDetails;

    if (!details || typeof details !== "object" || !("damageBreakdown" in details)) {
      return entry;
    }

    const { damageBreakdown: _db, ...restDetails } = details as typeof details & {
      damageBreakdown?: string;
    };

    void _db;

    return { ...entry, actionDetails: restDetails };
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
      const { stateBefore: _sb, ...rest } = entry as BattleAction & { stateBefore?: unknown };

      void _sb;

      return rest;
    }

    return entry;
  });
}

/**
 * Підготовлює battleLog для збереження в БД: slim + strip stateBefore.
 */
export function prepareBattleLogForStorage(
  battleLog: BattleAction[],
  keepLastN: number = STATE_BEFORE_KEEP_LAST_N,
): BattleAction[] {
  return stripStateBeforeForStorage(slimBattleLogForStorage(battleLog), keepLastN);
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
            const { stateBefore: _sb2, ...rest } = entry as BattleAction & {
              stateBefore?: unknown;
            };

            void _sb2;

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
