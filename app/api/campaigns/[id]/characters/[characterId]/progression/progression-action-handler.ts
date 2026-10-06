import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { loadProgressionContext } from "./load-progression-context";

import { prisma } from "@/lib/db";
import { canLearn, canUnlearn, normalizeTree, readUnlocked, type TreeNodes, writeUnlocked } from "@/lib/utils/skills/progression";

export type ProgressionAction = { type: "learn"; nodeId: string } | { type: "unlearn"; nodeIds: string[] } | { type: "reset" };

type Outcome = { ok: true; unlocked: string[] } | { ok: false; reason: string };

function learnOne(tree: TreeNodes, current: string[], level: number, nodeId: string): Outcome {
  const check = canLearn(tree, current, level, nodeId);

  return check.ok ? { ok: true, unlocked: [...current, nodeId] } : { ok: false, reason: check.reason };
}

function unlearnAll(tree: TreeNodes, current: string[], nodeIds: string[]): Outcome {
  let unlocked = current;

  for (const id of nodeIds) {
    const check = canUnlearn(tree, unlocked, id);

    if (!check.ok) return { ok: false, reason: check.reason };

    unlocked = unlocked.filter((x) => x !== id);
  }

  return { ok: true, unlocked };
}

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

    const outcome = action.type === "learn" ? learnOne(tree, current, character.level, action.nodeId) : unlearnAll(tree, current, action.nodeIds);

    if (!outcome.ok) return NextResponse.json({ reason: outcome.reason }, { status: 422 });

    unlocked = outcome.unlocked;
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
