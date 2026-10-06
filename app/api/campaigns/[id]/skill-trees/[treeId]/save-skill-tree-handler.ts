import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { readTreeJson, validateTree } from "@/lib/utils/skills/progression";

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

  if (oldJsonId && oldJsonId !== rowId) await moveProgressKey(campaignId, existing?.race ?? race, oldJsonId, rowId);

  const saved = await prisma.skillTree.update({ where: { id: rowId }, data: { skills: { ...raw, id: rowId, race } as Prisma.InputJsonValue } });

  return NextResponse.json({ id: saved.id, race: saved.race, skills: saved.skills });
}

// старий прогрес ключувався id з JSON дерева; після збереження JSON id = id рядка, тож переносимо ключ
async function moveProgressKey(campaignId: string, race: string, from: string, to: string) {
  const characters = await prisma.character.findMany({ where: { campaignId, race }, select: { id: true, skillTreeProgress: true } });

  for (const c of characters) {
    const progress = (c.skillTreeProgress ?? {}) as Record<string, unknown>;

    if (!(from in progress) || to in progress) continue;

    const { [from]: moved, ...rest } = progress;

    await prisma.character.update({ where: { id: c.id }, data: { skillTreeProgress: { [to]: moved, ...rest } as Prisma.InputJsonValue } });
  }
}
