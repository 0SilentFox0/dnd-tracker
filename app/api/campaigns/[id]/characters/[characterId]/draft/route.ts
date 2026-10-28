import { updateDraft } from "./update-draft";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function PATCH(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await updateDraft(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "update character draft" });
  }
}
