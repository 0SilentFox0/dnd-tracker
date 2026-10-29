import { notFound } from "next/navigation";

import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { HudFormPage } from "@/components/hud/form";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readAbilities } from "@/lib/utils/abilities/read";

export default async function EditArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string; setId: string }>;
}) {
  const { id, setId } = await params;

  await requireCampaignDM(id);

  const t = await getTranslator(await getRequestLocale(), "artifacts");

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
    <HudFormPage title={t("sets.edit.title")} aside={setRow.name}>
      <ArtifactSetForm
        campaignId={id}
        setId={setRow.id}
        initial={{
          name: setRow.name,
          description: setRow.description,
          icon: setRow.icon,
          setBonus: {
            name: typeof bonus.name === "string" ? bonus.name : undefined,
            description: typeof bonus.description === "string" ? bonus.description : undefined,
          },
          abilities,
          abilityIssues: issues,
          artifactIds: initialArtifactIds,
        }}
      />
    </HudFormPage>
  );
}
