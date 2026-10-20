import { NextResponse } from "next/server";

import { getCachedSpells } from "@/lib/cache/reference-data";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** `GET …/spells`; the DM spells page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readSpells({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    return NextResponse.json(await getCachedSpells(id), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list spells" });
  }
}
