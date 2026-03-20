import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string; setId: string }>;
}) {
  const { id, setId } = await params;

  const user = await getAuthUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId: user.id },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

  const setRow = await prisma.artifactSet.findFirst({
    where: { id: setId, campaignId: id },
    include: {
      artifacts: { select: { id: true } },
    },
  });

  if (!setRow) {
    notFound();
  }

  const initialArtifactIds = setRow.artifacts.map((a) => a.id);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/campaigns/${id}/dm/artifact-sets`}>← Назад</Link>
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Редагувати сет</h1>
        <p className="text-muted-foreground mt-1">{setRow.name}</p>
      </div>
      <ArtifactSetForm
        campaignId={id}
        setId={setRow.id}
        initialName={setRow.name}
        initialDescription={setRow.description}
        initialSetBonus={setRow.setBonus ?? {}}
        initialArtifactIds={initialArtifactIds}
      />
    </div>
  );
}
