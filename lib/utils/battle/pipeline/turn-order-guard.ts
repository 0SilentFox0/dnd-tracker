import type { BattleMutationOutcome, BattleSceneState } from "@/lib/utils/battle/store";
import { logger } from "@/lib/utils/logger";
import type { BattleParticipant } from "@/types/battle";

const ids = (ps: BattleParticipant[]) => ps.map((p) => p.basicInfo.id);

/**
 * Порядок ініціативи змінюють лише старт/скидання/відкат (history) і новий раунд.
 * Будь-яка інша мутація, що переставила наявних учасників, — баг рушія: повертаємо їхній порядок
 * (додані/видалені лишаються на своїх місцях) і пишемо помилку в лог.
 */
export function guardTurnOrder<T extends BattleMutationOutcome>(scene: BattleSceneState, before: BattleParticipant[], result: T, label = ""): T {
  if (result.history || (result.scene?.round ?? scene.round) !== scene.round || (result.scene?.status ?? scene.status) !== scene.status) return result;

  const after = result.participants;

  const kept = new Set(ids(after));

  const expected = ids(before).filter((id) => kept.has(id));

  const existed = new Set(expected);

  const actual = ids(after).filter((id) => existed.has(id));

  if (expected.every((id, i) => id === actual[i])) return result;

  logger.error("[battle-pipeline] mutation reordered initiative — restored", { mutation: label, battleId: scene.id, expected: expected.join(","), actual: actual.join(",") });

  const byId = new Map(after.map((p) => [p.basicInfo.id, p]));

  let next = 0;

  return { ...result, participants: after.map((p) => (existed.has(p.basicInfo.id) ? (byId.get(expected[next++]) as BattleParticipant) : p)) };
}
