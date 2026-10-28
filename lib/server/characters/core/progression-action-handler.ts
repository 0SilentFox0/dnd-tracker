import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { loadProgressionContext } from "./load-progression-context";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { operationAccess, withCharacterOperation } from "@/lib/server/characters/operation-context";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
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

export async function runProgressionActionUnlocked(campaignId: string, characterId: string, action: ProgressionAction, actor?: Actor): Promise<NextResponse> {
  const ctx = await loadProgressionContext(campaignId, characterId, actor);

  if (ctx instanceof NextResponse) return ctx;

  const { character, treeRow, isDM, progressRead } = ctx;

  if (action.type !== "learn" && !isDM) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  let nextProgress: Prisma.InputJsonValue;

  let unlocked: string[];

  if (action.type === "reset") {
    nextProgress = {};
    unlocked = [];
  } else {
    if (!treeRow) return NextResponse.json({ error: API_ERRORS.CHARACTER_RACE_TREE_MISSING }, { status: 404 });

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

  if (count === 0) return NextResponse.json({ error: API_ERRORS.CHARACTER_PROGRESS_CHANGED }, { status: 409 });

  return NextResponse.json({ unlocked });
}

export async function markLevelSeenUnlocked(campaignId: string, characterId: string, actor?: Actor): Promise<NextResponse> {
  const ctx = await loadProgressionContext(campaignId, characterId, actor);

  if (ctx instanceof NextResponse) return ctx;

  if (!ctx.isOwner) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  await prisma.character.updateMany({ where: { id: ctx.character.id }, data: { seenLevel: ctx.character.level } });

  return NextResponse.json({ seenLevel: ctx.character.level });
}

async function locked(campaignId: string, characterId: string, actor: Actor | undefined, run: () => Promise<NextResponse>) {
  const access = await operationAccess(campaignId, false, actor);

  if (access instanceof NextResponse) return access;

  return withCharacterOperation(campaignId, "progression", { characterId }, run);
}

export const runProgressionAction = (campaignId: string, characterId: string, action: ProgressionAction, actor?: Actor) =>
  locked(campaignId, characterId, actor, () => runProgressionActionUnlocked(campaignId, characterId, action, actor));

export const markLevelSeen = (campaignId: string, characterId: string, actor?: Actor) =>
  locked(campaignId, characterId, actor, () => markLevelSeenUnlocked(campaignId, characterId, actor));
