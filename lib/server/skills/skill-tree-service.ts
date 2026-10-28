import type { Prisma, SkillTree } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { readTreeJson, validateTree } from "@/lib/utils/skills/progression";

const MOVE_ATTEMPTS = 3;

class ProgressMoveConflict extends Error {}

export function listSkillTrees(actor: Actor): Promise<SkillTree[]> {
  assertCan(actor, CONTENT_OPERATIONS["skill-trees.list"].need);

  return prisma.skillTree.findMany({ where: { campaignId: actor.campaignId } });
}

export function readSkillTree(actor: Actor, race: string): Promise<SkillTree | null> {
  assertCan(actor, NEED.read("member"));

  return prisma.skillTree.findFirst({ where: { campaignId: actor.campaignId, race } });
}

export async function saveSkillTree(actor: Actor, input: { treeId?: string; race: string; skills: unknown }): Promise<SkillTree> {
  assertCan(actor, CONTENT_OPERATIONS["skill-trees.save"].need);

  const { campaignId } = actor;

  const { treeId, race, skills } = input;

  const raw = readTreeJson(skills);

  const [mainSkills, librarySkills] = await Promise.all([
    prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true } }),
    prisma.skill.findMany({ where: { campaignId }, select: { id: true } }),
  ]);

  const errors = validateTree(raw, { mainSkillIds: new Set(mainSkills.map((m) => m.id)), skillIds: new Set(librarySkills.map((s) => s.id)) });

  if (errors.length > 0) throw new ContentError(API_ERRORS.INVALID_SKILL_TREE, 400, errors);

  const existing =
    (treeId ? await prisma.skillTree.findFirst({ where: { id: treeId, campaignId } }) : null) ??
    (await prisma.skillTree.findFirst({ where: { campaignId, race } }));

  const rowId = existing?.id ?? (await prisma.skillTree.create({ data: { campaignId, race, skills: {} } })).id;

  const oldJsonId = existing ? readTreeJson(existing.skills).id : undefined;

  if (oldJsonId && oldJsonId !== rowId) {
    try {
      await moveProgressKey(campaignId, existing?.race ?? race, oldJsonId, rowId);
    } catch (error) {
      if (error instanceof ProgressMoveConflict) throw new ContentError(API_ERRORS.SKILL_TREE_PROGRESS_CHANGED, 409);

      throw error;
    }
  }

  return prisma.skillTree.update({ where: { id: rowId }, data: { skills: { ...raw, id: rowId, race } as Prisma.InputJsonValue } });
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
