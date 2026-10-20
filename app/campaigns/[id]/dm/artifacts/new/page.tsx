import { ArtifactCreateForm } from "@/components/artifacts/ArtifactCreateForm";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function NewArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const artifactSets = await prisma.artifactSet.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ArtifactCreateForm campaignId={id} artifactSets={artifactSets} />
  );
}
