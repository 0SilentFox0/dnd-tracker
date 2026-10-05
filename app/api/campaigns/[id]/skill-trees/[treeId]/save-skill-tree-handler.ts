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

  const saved = await prisma.skillTree.update({ where: { id: rowId }, data: { skills: { ...raw, id: rowId, race } as Prisma.InputJsonValue } });

  return NextResponse.json({ id: saved.id, race: saved.race, skills: saved.skills });
}
