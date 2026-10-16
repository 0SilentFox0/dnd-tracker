import type { Prisma } from "@prisma/client";

/**
 * Список сцен бою: лише метадані й лобі; стан учасників і журнал живуть в окремих таблицях.
 */
export const battleSceneListSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  participants: true,
  currentRound: true,
} satisfies Prisma.BattleSceneSelect;
