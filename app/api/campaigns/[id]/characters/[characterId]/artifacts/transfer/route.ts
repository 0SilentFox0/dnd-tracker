import { transferArtifact } from "./transfer-artifact";

import { handleApiError } from "@/lib/utils/api/error-handler";

type RouteContext = { params: Promise<{ id: string; characterId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id, characterId } = await params;

    return await transferArtifact(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "transfer artifact" });
  }
}
