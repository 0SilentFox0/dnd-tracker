import { readCharacterLog } from "@/lib/server/characters/core/read-character-log";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function GET(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await readCharacterLog(id, characterId, new URL(request.url).searchParams.get("cursor"));
  } catch (error) {
    return handleApiError(error, { action: "read character log" });
  }
}
