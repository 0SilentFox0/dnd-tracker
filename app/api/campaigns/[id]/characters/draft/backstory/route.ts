import { generateBackstory, readBackstoryAvailability } from "./generate-backstory";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await readBackstoryAvailability(id);
  } catch (error) {
    return handleApiError(error, { action: "check backstory AI" });
  }
}

export async function POST(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await generateBackstory(request, id);
  } catch (error) {
    return handleApiError(error, { action: "generate backstory" });
  }
}
