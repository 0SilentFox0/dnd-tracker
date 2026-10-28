import { createDraft } from "./create-draft";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await createDraft(request, id);
  } catch (error) {
    return handleApiError(error, { action: "create character draft" });
  }
}
