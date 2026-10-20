import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { artifactAbilities } from "@/lib/utils/abilities/read";
import { sheetStatBonuses } from "@/lib/utils/abilities/sheet-bonuses";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** `GET …/artifacts`; the DM artifacts page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readArtifacts({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    const rows = await prisma.artifact.findMany({
      where: { campaignId: id },
      include: { artifactSet: true },
      orderBy: { createdAt: "desc" },
    });

    const artifacts = rows.map(({ abilities, ...row }) => ({
      ...row,
      sheetBonuses: sheetStatBonuses(artifactAbilities({ ...row, abilities })),
      abilitySummary: abilitySummary("artifact", { ...row, abilities }),
    }));

    return NextResponse.json(artifacts);
  } catch (error) {
    return handleApiError(error, { action: "list artifacts" });
  }
}
