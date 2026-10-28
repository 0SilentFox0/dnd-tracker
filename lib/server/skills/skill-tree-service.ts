import type { Prisma, SkillTree } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { moveSkillTreeProgress } from "@/lib/server/skills/progress-move";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { readTreeJson, validateTree } from "@/lib/utils/skills/progression";

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

  if (oldJsonId && oldJsonId !== rowId) await moveProgressKey(campaignId, existing?.race ?? race, oldJsonId, rowId);

  return prisma.skillTree.update({ where: { id: rowId }, data: { skills: { ...raw, id: rowId, race } as Prisma.InputJsonValue } });
}

async function moveProgressKey(campaignId: string, race: string, from: string, to: string) {
  await prisma.$transaction((tx) => moveSkillTreeProgress(tx, campaignId, race, from, to));
}
