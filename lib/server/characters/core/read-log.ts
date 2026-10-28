import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { LOG_PAGE_SIZE } from "@/lib/constants/inventory";
import { prisma } from "@/lib/db";
import { operationAccess } from "@/lib/server/characters/operation-context";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import type { InventoryLogEntry } from "@/types/inventory";

export async function readLog(campaignId: string, characterId: string, cursor: string | null, actor?: Actor): Promise<NextResponse> {
  const access = await operationAccess(campaignId, false, actor);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (!access.isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const rows = await prisma.inventoryLog.findMany({
    where: { characterId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LOG_PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const page = rows.slice(0, LOG_PAGE_SIZE);

  const artifactIds = [...new Set(page.flatMap((r) => ((r.delta as { artifactId?: unknown }).artifactId as string | undefined) ?? []))];

  const [users, artifacts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...new Set(page.map((r) => r.actorUserId))] } }, select: PUBLIC_USER_SELECT }),
    artifactIds.length ? prisma.artifact.findMany({ where: { id: { in: artifactIds }, campaignId }, select: { id: true, name: true } }) : [],
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));

  const artifactName = new Map(artifacts.map((a) => [a.id, a.name]));

  const entries = page.map((r): InventoryLogEntry => {
    const delta = r.delta as Record<string, unknown>;

    const name = typeof delta.artifactId === "string" ? artifactName.get(delta.artifactId) : undefined;

    return {
      id: r.id,
      kind: r.kind as InventoryLogEntry["kind"],
      delta: name ? { ...delta, artifactName: name } : delta,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      actor: { id: r.actorUserId, displayName: userById.get(r.actorUserId)?.displayName ?? null },
    };
  });

  return NextResponse.json({ entries, nextCursor: rows.length > LOG_PAGE_SIZE ? page[page.length - 1].id : null });
}
