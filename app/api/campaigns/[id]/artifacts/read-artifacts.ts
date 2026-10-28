import { NextResponse } from "next/server";

import { readArtifactsList } from "@/lib/server/artifacts/read-artifacts-list";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** The DM artifacts page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readArtifacts({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    return NextResponse.json(await readArtifactsList(id));
  } catch (error) {
    return handleApiError(error, { action: "list artifacts" });
  }
}
