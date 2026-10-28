

import { patchCharacter } from "./patch-character";
import { readCharacter } from "./read-character";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await readCharacter(id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "fetch character" });
  }
}

export async function PATCH(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await patchCharacter(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "update character" });
  }
}

export { DELETE } from "@/lib/server/characters/operations/delete";
