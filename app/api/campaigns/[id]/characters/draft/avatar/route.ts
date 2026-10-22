import { generateDraftAvatar } from "./generate-avatar";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export const maxDuration = 120;

export async function POST(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await generateDraftAvatar(request, id);
  } catch (error) {
    return handleApiError(error, { action: "generate draft avatar" });
  }
}
