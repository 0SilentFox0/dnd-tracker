import { prisma } from "@/lib/db";
import type { WorldNote } from "@/types/world";

type NoteWithAuthor = { id: string; markerId: string; authorUserId: string; characterId: string | null; visibility: string; text: string; createdAt: Date; updatedAt: Date; author: { displayName: string } };

export const noteInclude = { author: { select: { displayName: true } } } as const;

export const toNote = (n: NoteWithAuthor, userId: string): WorldNote => ({
  id: n.id,
  markerId: n.markerId,
  authorUserId: n.authorUserId,
  authorName: n.author.displayName,
  characterId: n.characterId,
  visibility: n.visibility === "private" ? "private" : "public",
  text: n.text,
  mine: n.authorUserId === userId,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});

export async function listPublicMapNotes(mapId: string, userId: string): Promise<WorldNote[]> {
  const rows = await prisma.worldNote.findMany({ where: { marker: { mapId }, visibility: "public" }, include: noteInclude, orderBy: { createdAt: "asc" } });

  return rows.map((n) => toNote(n, userId));
}
