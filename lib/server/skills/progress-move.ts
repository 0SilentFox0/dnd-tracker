import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

const MOVE_ATTEMPTS = 3;

type ProgressDb = Pick<Prisma.TransactionClient, "character">;

// старий прогрес ключувався id з JSON дерева; після збереження JSON id = id рядка, тож переносимо ключ
export async function moveSkillTreeProgress(tx: ProgressDb, campaignId: string, race: string, from: string, to: string) {
  const characters = await tx.character.findMany({ where: { campaignId, race }, select: { id: true, skillTreeProgress: true } });

  for (const c of characters) await moveOne(tx, c.id, c.skillTreeProgress, from, to);
}

async function moveOne(tx: ProgressDb, id: string, read: unknown, from: string, to: string) {
  let progress = read;

  for (let attempt = 0; attempt < MOVE_ATTEMPTS; attempt++) {
    const next = movedProgress(progress, from, to);

    if (!next) return;

    const { count } = await tx.character.updateMany({
      where: { id, skillTreeProgress: { equals: progress as Prisma.InputJsonValue } },
      data: { skillTreeProgress: next },
    });

    if (count > 0) return;

    const fresh = await tx.character.findUnique({ where: { id }, select: { skillTreeProgress: true } });

    if (!fresh) return;

    progress = fresh.skillTreeProgress;
  }

  throw new ContentError(API_ERRORS.SKILL_TREE_PROGRESS_CHANGED, 409);
}

function movedProgress(progress: unknown, from: string, to: string): Prisma.InputJsonValue | null {
  if (!progress || typeof progress !== "object") return null;

  const current = progress as Record<string, unknown>;

  if (!(from in current) || to in current) return null;

  const { [from]: moved, ...rest } = current;

  return { [to]: moved, ...rest } as Prisma.InputJsonValue;
}
