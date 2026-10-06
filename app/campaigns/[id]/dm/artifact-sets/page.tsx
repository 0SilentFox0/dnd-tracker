import Link from "next/link";
import { Layers } from "lucide-react";

import { ArtifactSetCard } from "@/components/artifact-sets/ArtifactSetCard";
import { EmptyState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { abilitySummary } from "@/lib/utils/abilities/summary";

export default async function DMArtifactSetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const sets = await prisma.artifactSet.findMany({
    where: { campaignId: id },
    include: {
      artifacts: { select: { id: true, name: true, slot: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <HudPage>
      <HudPageHeader
        title="Сети артефактів"
        subtitle="Групи артефактів з бонусом за повний комплект (у бою)"
        actions={
          <>
            <Button asChild>
              <Link href={`/campaigns/${id}/dm/artifact-sets/new`}>
                + Новий сет
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/campaigns/${id}/dm/artifacts`}>До артефактів</Link>
            </Button>
          </>
        }
      />

      {sets.length === 0 ? (
        <EmptyState
          className="bg-[rgba(17,14,11,.82)]"
          icon={Layers}
          title="Ще немає сетів"
          description="Сет дає бонус, коли персонаж носить усі його артефакти."
          action={
            <Button asChild>
              <Link href={`/campaigns/${id}/dm/artifact-sets/new`}>Створити перший сет</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sets.map((s) => (
            <ArtifactSetCard
              key={s.id}
              variant="summary"
              campaignId={id}
              set={{ ...s, abilitySummary: abilitySummary("artifactSet", s) }}
              artifacts={s.artifacts}
            />
          ))}
        </div>
      )}
    </HudPage>
  );
}
