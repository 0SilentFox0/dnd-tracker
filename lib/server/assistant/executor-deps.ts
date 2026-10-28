import type { Prisma, PrismaClient } from "@prisma/client";

import type { createActionCatalog } from "./catalog";
import type { EffectHandlers } from "./effects";
import type { AssistantCaller, ExecutionMode } from "./types";

import "server-only";
import { executionModeSchema } from "@/lib/schemas/assistant";
import { ContentError, parseInput } from "@/lib/server/content/errors";

export type ExecutorDeps = {
  db: PrismaClient;
  catalog: ReturnType<typeof createActionCatalog>;
  now: () => Date;
  effects: EffectHandlers;
};

export async function executionModeFor(caller: AssistantCaller, client: Pick<Prisma.TransactionClient, "apiToken" | "aiThread">): Promise<ExecutionMode> {
  if (caller.actor.via === "token") {
    const row = await client.apiToken.findUnique({ where: { id: caller.tokenId ?? "" }, select: { executionMode: true } });

    if (!row) throw new ContentError("Дія недоступна", 403);

    return parseInput(executionModeSchema, row.executionMode);
  }

  if (!caller.threadId) return "review";

  const row = await client.aiThread.findFirst({ where: { id: caller.threadId, campaignId: caller.actor.campaignId, userId: caller.actor.userId }, select: { executionMode: true } });

  if (!row) throw new ContentError("Дія недоступна", 403);

  return parseInput(executionModeSchema, row.executionMode);
}
