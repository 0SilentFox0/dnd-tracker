import { operationAccess, operationDM } from "./campaign-access";
export { operationAccess, operationDM } from "./campaign-access";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { lockCharacters } from "./lock";

import { prisma } from "@/lib/db";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";


/** Keep the existing HTTP signature while sharing the same transaction and character locks. */
export function guardedCharacterHandler<A extends unknown[]>(handler: (...args: A) => Promise<NextResponse>, operation: string): (...args: A) => Promise<NextResponse> {
  if (["list", "get", "roster"].includes(operation)) return handler;

  return async (...args) => {
    const strings = args.filter((v): v is string => typeof v === "string");

    const route = args.find(v => v && typeof v === "object" && "params" in v) as { params: Promise<{ id: string; characterId: string }> } | undefined;

    const params = route ? await route.params : undefined;

    const campaignId = params?.id ?? strings[0];

    const characterId = params?.characterId ?? strings[1];

    if (!campaignId) throw new Error("Missing campaign id");

    const access = await handlerAccess(campaignId, characterId, operation, explicitActor(args));

    if (access instanceof NextResponse) return access;

    const request = args.find(v => v instanceof Request) as Request | undefined;

    let input: Record<string, unknown> = { characterId };

    if (request && !["GET", "HEAD"].includes(request.method)) {
      try { input = { ...await request.clone().json(), characterId }; } catch { /* handler returns its established invalid-body response */ }
    }

    if (request && ["create", "patch"].includes(operation) && input.avatar !== undefined) {
      const access = operation === "create" ? await operationDM(campaignId, explicitActor(args)) : await operationAccess(campaignId, false, explicitActor(args));

      if (access instanceof NextResponse) return access;

      if (access.isDM) {
        const { createCharacterSchema } = await import("@/app/api/campaigns/[id]/characters/create-character-schema");

        const { updateCharacterSchema } = await import("@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema");

        if ((operation === "create" ? createCharacterSchema : updateCharacterSchema).safeParse(input).success) {
          const character = characterId ? await prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, avatar: true } }) : null;

          if (characterId && (!character || character.campaignId !== campaignId)) return errorResponse("Персонажа не знайдено", 404);

          const { resolveAvatarForPersistence } = await import("@/lib/supabase/avatar-storage");

          const avatar = await resolveAvatarForPersistence(input.avatar as string | null, { campaignId, current: character?.avatar });

          if (!avatar.ok) return errorResponse(avatar.message, 400);

          input.avatar = avatar.avatar;
          args[args.indexOf(request as A[number])] = new Request(request, { body: JSON.stringify(input) }) as A[number];
        }
      }
    }

    return withCharacterOperation(campaignId, operation, input, () => handler(...args));
  };
}

export function characterIds(input: Record<string, unknown>): string[] {
  return [...new Set([input.characterId, input.toCharacterId, ...(Array.isArray(input.characterIds) ? input.characterIds : [])].filter((id): id is string => typeof id === "string" && id.length > 0))].sort();
}

export function withCharacterOperation<T>(campaignId: string, operation: string, input: Record<string, unknown>, callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return withCampaignContentWrite(campaignId, async tx => {
    // Keep artifact ownership serialization before any character/inventory row locks.
    if (["inventory-update", "stash-update", "transfer", "inventory.patch", "stash.apply"].includes(operation)) await lockCampaignArtifacts(tx, campaignId);

    const ids = operation === "delete-all"
      ? (await tx.character.findMany({ where: { campaignId, type: "player" }, select: { id: true }, orderBy: { id: "asc" } })).map(row => row.id)
      : characterIds(input);

    await lockCharacters(tx, ids);

    return callback(tx);
  });
}

function explicitActor(args: unknown[]): Actor | undefined {
  return args.find((value): value is Actor => !!value && typeof value === "object" && "via" in value && "campaignId" in value && "userId" in value);
}

async function handlerAccess(campaignId: string, characterId: string | undefined, operation: string, actor?: Actor) {
  if (["choices", "resources", "roll", "hit-dice", "inspiration"].includes(operation) && characterId) {
    const access = await import("./access");

    const gate = operation === "inspiration" ? access.requireCharacterRow : access.requireCharacterAccess;

    return gate(campaignId, characterId, { actor, dmOnly: ["resources", "inspiration"].includes(operation) });
  }

  if (["create", "review", "delete", "delete-all", "inventory-update", "level-up", "rest", "experience"].includes(operation)) return operationDM(campaignId, actor);

  return operationAccess(campaignId, operation.startsWith("tokens-"), actor);
}
