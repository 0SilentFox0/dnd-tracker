import { cache } from "react";

import "server-only";
import { prisma } from "@/lib/db";

export const isWfrpCampaign = cache(async (campaignId: string): Promise<boolean> => {
  const rows = await prisma.$queryRaw<{ wfrp: boolean | null }[]>`SELECT (rules->'system'->>'key') = 'wfrp' AS wfrp FROM campaigns WHERE id = ${campaignId}`;

  return rows[0]?.wfrp === true;
});
