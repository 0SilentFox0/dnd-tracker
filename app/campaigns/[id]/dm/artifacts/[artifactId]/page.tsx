import { redirect } from "next/navigation";

import { ArtifactEditForm } from "@/components/artifacts/ArtifactEditForm";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditArtifactPage({
  params,
}: {
  params: Promise<{ id: string; artifactId: string }>;
}) {
  const { id, artifactId } = await params;

  const user = await getAuthUser();

  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

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
          bonuses: (artifact.bonuses as Record<string, number>) || {},
          passiveAbility: artifact.passiveAbility as { name?: string; description?: string } | null,
        }}
        artifactSets={artifactSets}
      />
    </div>
  );
}
