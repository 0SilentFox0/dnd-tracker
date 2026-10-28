import type { Prisma } from "@prisma/client";

import type { AssistantCaller } from "./types";

import "server-only";
import { hasScope, isApiTokenScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";
import { isDmMember } from "@/lib/utils/api/is-dm";

type AuthorizationDb = Pick<Prisma.TransactionClient, "campaignMember" | "apiToken">;

/** Reusable identity recheck, also for the pre-existing narrow ai read tools. */
export async function revalidateAssistantCaller(caller: AssistantCaller, db: AuthorizationDb = prisma): Promise<Actor> {
  const { actor } = caller;

  const forbidden = () => new ContentError(API_ERRORS.FORBIDDEN, 403);

  if (!actor.isDM || !actor.campaignId || !actor.userId) throw forbidden();

  if (actor.via !== "token" && actor.via !== "session") throw forbidden();

  if (actor.via === "token" && (caller.channel !== "mcp" || !caller.tokenId || !actor.scopes)) throw forbidden();

  if (actor.via === "session" && (caller.channel !== "chat" || caller.tokenId !== null || actor.scopes !== null)) throw forbidden();

  const members = await db.campaignMember.findMany({ where: { campaignId: actor.campaignId, userId: actor.userId }, select: { role: true } });

  if (!isDmMember(members)) throw forbidden();

  if (actor.via === "session") return actor;

  const token = await db.apiToken.findUnique({ where: { id: caller.tokenId as string }, select: { id: true, campaignId: true, userId: true, scopes: true, revokedAt: true } });

  if (!token || token.revokedAt || token.campaignId !== actor.campaignId || token.userId !== actor.userId) throw forbidden();

  return { ...actor, scopes: token.scopes.filter(isApiTokenScope) };
}

export async function authorizeLegacyAssistantRead(caller: AssistantCaller): Promise<void> {
  const live = await revalidateAssistantCaller(caller);

  if (caller.actor.via === "token" && (!hasScope(caller.actor.scopes ?? [], "ai") || !hasScope(live.scopes ?? [], "ai"))) throw new ContentError(API_ERRORS.FORBIDDEN, 403);
}

export async function authorizeAssistant(caller: AssistantCaller, need: ActorNeed, phase: "prepare" | "execute" = "execute", db: AuthorizationDb = prisma): Promise<void> {
  if (phase !== "prepare" && phase !== "execute") throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  const effectiveNeed: ActorNeed = { ...need, access: "dm", ...(phase === "prepare" && { sessionOnly: undefined }) };

  assertCan(caller.actor, effectiveNeed);

  const live = await revalidateAssistantCaller(caller, db);

  // Both the original request grants and the persisted token must still permit it.
  assertCan(live, effectiveNeed);
}
