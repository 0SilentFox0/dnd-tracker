import type { Prisma } from '@prisma/client';

export const battleSceneListSelect = {
    id: true,
    name: true,
    description: true,
    status: true,
    participants: true,
    currentRound: true,
} satisfies Prisma.BattleSceneSelect;
