import Link from "next/link";

import { DeleteAllBattlesButton } from "./page-client";

import { BattleSections } from "@/components/battle/list/BattleSections";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { battleSceneListSelect } from "@/lib/utils/battle/store/scene-list-select";

export default async function DMBattlesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const battles = await prisma.battleScene.findMany({
    where: {
      campaignId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: battleSceneListSelect,
  });

  return (
    <HudPage>
      <HudPageHeader
        title="Сцени Боїв"
        subtitle="Створення та управління боями"
        actions={
          <>
            <Link href={`/campaigns/${id}/dm/battles/new`} className="shrink-0">
              <Button className="whitespace-nowrap">+ Створити сцену бою</Button>
            </Link>
            <DeleteAllBattlesButton campaignId={id} battlesCount={battles.length} />
          </>
        }
      />
      <OnboardingHint id="dm.battles" />

      <BattleSections battles={battles} campaignId={id} />
    </HudPage>
  );
}
