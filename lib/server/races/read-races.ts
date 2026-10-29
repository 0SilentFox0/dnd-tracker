import { NextResponse } from "next/server";

import { getCachedRaces } from "@/lib/cache/reference-data";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** `GET …/races`; the DM races page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readRaces({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    return NextResponse.json(await getCachedRaces(id), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list races" });
  }
}
