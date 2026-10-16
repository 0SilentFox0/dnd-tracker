import { readRoster } from "./read-roster";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await readRoster(id);
  } catch (error) {
    return handleApiError(error, { action: "fetch roster" });
  }
}
