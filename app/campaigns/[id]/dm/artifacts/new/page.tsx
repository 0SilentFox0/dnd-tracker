import { redirect } from "next/navigation";

import { ArtifactCreateForm } from "@/components/artifacts/ArtifactCreateForm";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NewArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const artifactSets = await prisma.artifactSet.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <ArtifactCreateForm campaignId={id} artifactSets={artifactSets} />
    </div>
  );
}
