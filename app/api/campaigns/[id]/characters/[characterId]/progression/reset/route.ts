import { runProgressionAction } from "../progression-action-handler";

import { handleApiError } from "@/lib/utils/api/error-handler";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    return await runProgressionAction(id, characterId, { type: "reset" });
  } catch (error) {
    return handleApiError(error, { action: "reset skill progression" });
  }
}
