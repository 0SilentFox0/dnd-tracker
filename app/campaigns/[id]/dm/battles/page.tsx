import Link from "next/link";
import { Swords } from "lucide-react";

import { BattleListCard, type BattleListKind } from "./BattleListCard";
import { DeleteAllBattlesButton } from "./page-client";

import { EmptyState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { battleSceneListSelect } from "@/lib/utils/battle/battle-scene-list-select";

const SECTIONS: { kind: BattleListKind; title: string }[] = [
  { kind: BattleStatus.ACTIVE, title: "Активні бої" },
  { kind: BattleStatus.PREPARED, title: "Підготовлені бої" },
  { kind: BattleStatus.COMPLETED, title: "Завершені бої" },
];

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

      {SECTIONS.map(({ kind, title }) => {
        const list = battles.filter((b) => b.status === kind);

        if (list.length === 0) return null;

        return (
          <HudPanel key={kind}>
            <HudSection title={title}>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((battle) => (
                  <BattleListCard key={battle.id} battle={battle} campaignId={id} kind={kind} />
                ))}
              </div>
            </HudSection>
          </HudPanel>
        );
      })}

      {battles.length === 0 && (
        <EmptyState
          className="bg-hud-panel"
          icon={Swords}
          title="Поки немає сцен боїв"
          action={
            <Link href={`/campaigns/${id}/dm/battles/new`}>
              <Button>Створити першу сцену бою</Button>
            </Link>
          }
        />
      )}
    </HudPage>
  );
}
