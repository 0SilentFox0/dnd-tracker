import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { Button } from "@/components/ui/button";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function EditArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string; setId: string }>;
}) {
  const { id, setId } = await params;

  await requireCampaignDM(id);

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
        initialIcon={setRow.icon}
        initialSetBonus={setRow.setBonus ?? {}}
        initialArtifactIds={initialArtifactIds}
      />
    </div>
  );
}
