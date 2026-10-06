import { readCharacterSheet } from "./read-sheet";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  return readCharacterSheet(await params);
}
