import { NextResponse } from "next/server";

import { listArtifactSets } from "@/lib/server/artifacts/artifact-set-queries";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** `GET …/artifact-sets`; the DM artifacts page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readArtifactSets({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    return NextResponse.json(await listArtifactSets(id));
  } catch (error) {
    return handleApiError(error, { action: "list artifact sets" });
  }
}
