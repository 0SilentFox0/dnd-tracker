import type { Prisma } from "@prisma/client";

/**
 * Список сцен бою: лише метадані й лобі; стан учасників і журнал живуть в окремих таблицях.
 */
export const battleSceneListSelect = {
  id: true,
  campaignId: true,
  name: true,
  description: true,
  status: true,
  participants: true,
  currentRound: true,
  currentTurnIndex: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
} satisfies Prisma.BattleSceneSelect;
