import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { readTreeJson, validateTree } from "@/lib/utils/skills/progression";

const MOVE_ATTEMPTS = 3;

class ProgressMoveConflict extends Error {}

export async function saveSkillTree(campaignId: string, treeId: string, race: string, skills: unknown): Promise<NextResponse> {
  const raw = readTreeJson(skills);

  const [mainSkills, librarySkills] = await Promise.all([
    prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true } }),
    prisma.skill.findMany({ where: { campaignId }, select: { id: true } }),
  ]);

  const errors = validateTree(raw, { mainSkillIds: new Set(mainSkills.map((m) => m.id)), skillIds: new Set(librarySkills.map((s) => s.id)) });

  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  const existing =
    (await prisma.skillTree.findFirst({ where: { id: treeId, campaignId } })) ??
    (await prisma.skillTree.findFirst({ where: { campaignId, race } }));

  const rowId = existing?.id ?? (await prisma.skillTree.create({ data: { campaignId, race, skills: {} } })).id;

  const oldJsonId = existing ? readTreeJson(existing.skills).id : undefined;

  if (oldJsonId && oldJsonId !== rowId) {
    try {
      await moveProgressKey(campaignId, existing?.race ?? race, oldJsonId, rowId);
    } catch (error) {
      if (error instanceof ProgressMoveConflict) {
        return NextResponse.json({ error: "Прогрес персонажів змінився під час збереження, спробуйте ще раз" }, { status: 409 });
      }

      throw error;
    }
  }

  const saved = await prisma.skillTree.update({ where: { id: rowId }, data: { skills: { ...raw, id: rowId, race } as Prisma.InputJsonValue } });

  return NextResponse.json({ id: saved.id, race: saved.race, skills: saved.skills });
}

// старий прогрес ключувався id з JSON дерева; після збереження JSON id = id рядка, тож переносимо ключ
async function moveProgressKey(campaignId: string, race: string, from: string, to: string) {
  await prisma.$transaction(async (tx) => {
    const characters = await tx.character.findMany({ where: { campaignId, race }, select: { id: true, skillTreeProgress: true } });

    for (const c of characters) await moveOne(tx, c.id, c.skillTreeProgress, from, to);
  });
}

async function moveOne(tx: Prisma.TransactionClient, id: string, read: unknown, from: string, to: string) {
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

  throw new ProgressMoveConflict();
}

function movedProgress(progress: unknown, from: string, to: string): Prisma.InputJsonValue | null {
  if (!progress || typeof progress !== "object") return null;

  const current = progress as Record<string, unknown>;

  if (!(from in current) || to in current) return null;

  const { [from]: moved, ...rest } = current;

  return { [to]: moved, ...rest } as Prisma.InputJsonValue;
}
