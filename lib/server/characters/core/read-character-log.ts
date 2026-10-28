import { NextResponse } from "next/server";

import { CHARACTER_LOG_PAGE_SIZE } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { requireCharacterRow } from "@/lib/server/characters/access";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { Actor } from "@/lib/utils/api/actor";
import type { CharacterLogEntry } from "@/types/characters";

export async function readCharacterLog(campaignId: string, characterId: string, cursor: string | null, actor?: Actor): Promise<NextResponse> {
  const gate = await requireCharacterRow(campaignId, characterId, { actor });

  if (gate instanceof NextResponse) return gate;

  const rows = await prisma.characterLog.findMany({
    where: { characterId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: CHARACTER_LOG_PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const page = rows.slice(0, CHARACTER_LOG_PAGE_SIZE);

  const actorIds = [...new Set(page.flatMap((r) => (r.actorUserId ? [r.actorUserId] : [])))];

  const users = actorIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: PUBLIC_USER_SELECT }) : [];

  const nameOf = new Map(users.map((u) => [u.id, u.displayName]));

  const entries = page.map((r): CharacterLogEntry => ({
    id: r.id,
    kind: r.kind as CharacterLogEntry["kind"],
    data: r.data as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    actor: r.actorUserId ? { id: r.actorUserId, displayName: nameOf.get(r.actorUserId) ?? null } : null,
  }));

  return NextResponse.json({ entries, nextCursor: rows.length > CHARACTER_LOG_PAGE_SIZE ? page[page.length - 1].id : null });
}
