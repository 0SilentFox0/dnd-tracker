import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { loadProgressionContext } from "./load-progression-context";

import { prisma } from "@/lib/db";
import { canLearn, canUnlearn, normalizeTree, readUnlocked, writeUnlocked } from "@/lib/utils/skills/progression";

export type ProgressionAction = { type: "learn"; nodeId: string } | { type: "unlearn"; nodeId: string } | { type: "reset" };

export async function runProgressionAction(campaignId: string, characterId: string, action: ProgressionAction): Promise<NextResponse> {
  const ctx = await loadProgressionContext(campaignId, characterId);

  if (ctx instanceof NextResponse) return ctx;

  const { character, treeRow, isDM, progressRead } = ctx;

  if (action.type !== "learn" && !isDM) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let nextProgress: Prisma.InputJsonValue;

  let unlocked: string[];

  if (action.type === "reset") {
    nextProgress = {};
    unlocked = [];
  } else {
    if (!treeRow) return NextResponse.json({ error: "Дерева для раси немає" }, { status: 404 });

    const tree = normalizeTree(treeRow);

    const current = readUnlocked(tree, character.skillTreeProgress);

    const check = action.type === "learn" ? canLearn(tree, current, character.level, action.nodeId) : canUnlearn(tree, current, action.nodeId);

    if (!check.ok) return NextResponse.json({ reason: check.reason }, { status: 422 });

    unlocked = action.type === "learn" ? [...current, action.nodeId] : current.filter((id) => id !== action.nodeId);
    nextProgress = writeUnlocked(tree, character.skillTreeProgress, unlocked) as Prisma.InputJsonValue;
  }

  const { count } = await prisma.character.updateMany({
    where: { id: character.id, level: character.level, skillTreeProgress: { equals: progressRead } },
    data: { skillTreeProgress: nextProgress },
  });

  if (count === 0) return NextResponse.json({ error: "Прогрес змінився" }, { status: 409 });

  return NextResponse.json({ unlocked });
}

export async function markLevelSeen(campaignId: string, characterId: string): Promise<NextResponse> {
  const ctx = await loadProgressionContext(campaignId, characterId);

  if (ctx instanceof NextResponse) return ctx;

  if (!ctx.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.character.updateMany({ where: { id: ctx.character.id }, data: { seenLevel: ctx.character.level } });

  return NextResponse.json({ seenLevel: ctx.character.level });
}
