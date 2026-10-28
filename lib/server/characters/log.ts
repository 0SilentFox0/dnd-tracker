import type { Prisma } from "@prisma/client";

import type { CharacterLogKindValue } from "@/lib/constants/character-log";

// без server-only: модуль імпортує battle store, який вантажать симуляції через tsx
export type CharacterLogInput = { campaignId: string; characterId: string; actorUserId: string | null; kind: CharacterLogKindValue; data: Record<string, unknown> };

export async function writeCharacterLog(tx: Pick<Prisma.TransactionClient, "characterLog">, entries: CharacterLogInput[]): Promise<void> {
  if (entries.length === 0) return;

  await tx.characterLog.createMany({ data: entries.map((e) => ({ ...e, data: e.data as Prisma.InputJsonValue })) });
}
