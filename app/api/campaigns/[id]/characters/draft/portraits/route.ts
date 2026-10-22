import { readDraftPortraits } from "./read-portraits";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function GET(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await readDraftPortraits(id, new URL(request.url).searchParams.get("race")?.trim() || undefined);
  } catch (error) {
    return handleApiError(error, { action: "read draft portraits" });
  }
}
