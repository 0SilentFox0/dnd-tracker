import "server-only";
import { prisma } from "@/lib/db";
import { artifactAbilities } from "@/lib/utils/abilities/read";
import { sheetStatBonuses } from "@/lib/utils/abilities/sheet-bonuses";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";

function itemKindBadge(row: { modifiers?: unknown }) {
  const stats = itemStatsFromRow(row);

  if (stats?.property) return { itemKind: "property" as const };

  return stats?.unique === false ? { itemKind: "gear" as const } : {};
}

export async function readArtifactsList(campaignId: string) {
  const rows = await prisma.artifact.findMany({
    where: { campaignId },
    include: { artifactSet: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(({ abilities, ...row }) => ({
    ...row,
    ...itemKindBadge(row),
    sheetBonuses: sheetStatBonuses(artifactAbilities({ ...row, abilities })),
    abilitySummary: abilitySummary("artifact", { ...row, abilities }),
  }));
}
