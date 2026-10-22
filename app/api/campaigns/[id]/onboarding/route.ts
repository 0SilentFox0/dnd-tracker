import { readCampaignOnboarding } from "./read-onboarding";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await readCampaignOnboarding({ id });
  } catch (error) {
    return handleApiError(error, { action: "read campaign onboarding" });
  }
}
