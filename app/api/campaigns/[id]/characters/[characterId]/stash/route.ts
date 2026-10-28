import { applyStash } from "./apply-stash";

import { readStash } from "@/lib/server/characters/core/read-stash";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await readStash(id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "read stash" });
  }
}

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await applyStash(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "apply stash action" });
  }
}
