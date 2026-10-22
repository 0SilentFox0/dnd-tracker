import { reviewCharacter } from "./review-character";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await reviewCharacter(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "review character" });
  }
}
