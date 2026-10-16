import { transferArtifact } from "./transfer-artifact";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await transferArtifact(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "transfer artifact" });
  }
}
