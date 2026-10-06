import { notFound } from "next/navigation";

import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { HudFormPage } from "@/components/hud/form";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { readAbilities } from "@/lib/utils/abilities/read";

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

  const { abilities, issues } = readAbilities("artifactSet", setRow);

  const bonus = (setRow.setBonus ?? {}) as { name?: unknown; description?: unknown };

  return (
    <HudFormPage title="Редагувати сет" aside={setRow.name}>
      <ArtifactSetForm
        campaignId={id}
        setId={setRow.id}
        initialName={setRow.name}
        initialDescription={setRow.description}
        initialIcon={setRow.icon}
        initialSetBonus={{
          name: typeof bonus.name === "string" ? bonus.name : undefined,
          description: typeof bonus.description === "string" ? bonus.description : undefined,
        }}
        initialAbilities={abilities}
        initialAbilityIssues={issues}
        initialArtifactIds={initialArtifactIds}
      />
    </HudFormPage>
  );
}
