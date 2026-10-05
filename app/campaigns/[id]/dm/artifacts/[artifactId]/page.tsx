import { redirect } from "next/navigation";

import { ArtifactEditForm } from "@/components/artifacts/ArtifactEditForm";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { readAbilities } from "@/lib/utils/abilities/legacy/read";

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
    <div className="container mx-auto p-4 max-w-4xl">
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
        }}
        artifactSets={artifactSets}
      />
    </div>
  );
}
