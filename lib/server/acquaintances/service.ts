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

export const findAcquaintanceByName = (tx: Prisma.TransactionClient, campaignId: string, name: string) =>
  tx.acquaintance.findFirst({ where: { campaignId, name: { equals: name.trim(), mode: "insensitive" } }, include: ACQUAINTANCE_INCLUDE, orderBy: { createdAt: "asc" } });

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
