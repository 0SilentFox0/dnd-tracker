import { Prisma } from "@prisma/client";

import { readResources } from "@/lib/utils/characters/resources/schema";
import type { CharacterResources } from "@/types/characters";

export interface LockedCharacter {
  id: string;
  resources: CharacterResources;
  experience: number;
}

/** SELECT … FOR UPDATE у транзакції: read-modify-write ресурсів/досвіду не губить паралельні правки. */
export async function lockCharacters(tx: Pick<Prisma.TransactionClient, "$queryRaw">, ids: string[]): Promise<Map<string, LockedCharacter>> {
  if (ids.length === 0) return new Map();

  const rows = await tx.$queryRaw<{ id: string; resources: unknown; experience: number }[]>`
    SELECT id, resources, experience FROM characters WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;

  return new Map(rows.map((r) => [r.id, { id: r.id, resources: readResources(r.resources), experience: r.experience }]));
}
