import { readCharacterSheet } from "@/lib/server/characters/core/read-sheet";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  return readCharacterSheet(await params);
}
