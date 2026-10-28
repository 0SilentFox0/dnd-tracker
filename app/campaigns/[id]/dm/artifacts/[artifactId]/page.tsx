import { redirect } from "next/navigation";

import { ArtifactEditForm } from "@/components/artifacts/ArtifactEditForm";
import { SourceNotes } from "@/components/content-import/SourceNotes";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readAbilities } from "@/lib/utils/abilities/read";
import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";

export default async function EditArtifactPage({
  params,
}: {
  params: Promise<{ id: string; artifactId: string }>;
}) {
  const { id, artifactId } = await params;

  await requireCampaignDM(id);

  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId, campaignId: id },
    include: { artifactSet: true },
  });

  if (!artifact) {
    redirect(`/campaigns/${id}/dm/artifacts`);
  }

  const artifactSets = await prisma.artifactSet.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const { abilities, issues } = readAbilities("artifact", artifact);

  return (
    <>
    <SourceNotes campaignId={id} kind="artifacts" targetId={artifactId} />
    <ArtifactEditForm
      campaignId={id}
      artifact={{
        id: artifact.id,
        name: artifact.name,
        description: artifact.description,
        rarity: artifact.rarity,
        slot: artifact.slot,
        icon: artifact.icon,
        setId: artifact.setId,
        abilities,
        abilityIssues: issues,
        weapon: weaponStatsFromRow(artifact),
        armor: armorStatsFromRow(artifact),
        item: itemStatsFromRow(artifact),
      }}
      artifactSets={artifactSets}
    />
    </>
  );
}
