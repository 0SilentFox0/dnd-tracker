import type { Prisma } from "@prisma/client";

import { ACQUAINTANCE_INCLUDE } from "./store";

import "server-only";

export interface CreateAcquaintanceInput {
  id?: string;
  kind: "character" | "micro";
  characterId?: string | null;
  name: string;
  description: string;
  avatarUrl?: string | null;
  sourcePageId: string;
  sourceSectionId: string;
}

export const findAcquaintanceByCharacter = (tx: Prisma.TransactionClient, campaignId: string, characterId: string) =>
  tx.acquaintance.findFirst({ where: { campaignId, characterId }, include: ACQUAINTANCE_INCLUDE });

export async function findAcquaintancesByNames(tx: Prisma.TransactionClient, campaignId: string, names: string[]) {
  const found = new Map<string, string>();

  if (names.length === 0) return found;

  const rows = await tx.acquaintance.findMany({
    where: { campaignId, OR: names.map((name) => ({ name: { equals: name.trim(), mode: "insensitive" as const } })) },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  for (const r of rows) {
    const key = r.name.trim().toLowerCase();

    if (!found.has(key)) found.set(key, r.id);
  }

  return found;
}

export const createAcquaintance = (tx: Prisma.TransactionClient, campaignId: string, input: CreateAcquaintanceInput) =>
  tx.acquaintance.create({
    data: {
      ...(input.id && { id: input.id }),
      campaignId,
      kind: input.kind,
      characterId: input.kind === "character" ? (input.characterId ?? null) : null,
      name: input.name,
      description: input.description,
      avatarUrl: input.avatarUrl ?? null,
      sourcePageId: input.sourcePageId,
      sourceSectionId: input.sourceSectionId,
    },
    include: ACQUAINTANCE_INCLUDE,
  });
