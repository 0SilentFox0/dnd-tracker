import type { Prisma } from "@prisma/client";

/**
 * Список сцен бою без `battleLog` — лог може займати мегабайти й множити Supabase pooler egress.
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
  initiativeOrder: true,
  pendingSummons: true,
  pendingMoraleCheck: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
} satisfies Prisma.BattleSceneSelect;
