import { readFreeArtifacts } from "./read-free-artifacts";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CharacterRouteContext) {
  try {
    const { id } = await params;

    return await readFreeArtifacts(id);
  } catch (error) {
    return handleApiError(error, { action: "read free artifacts" });
  }
}
