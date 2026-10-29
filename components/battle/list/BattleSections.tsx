"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";

import { BattleListCard } from "@/components/battle/list/BattleListCard";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useBattleListSections } from "@/lib/hooks/battles";

type Battle = Parameters<typeof BattleListCard>[0]["battle"] & { status: string };

export function BattleSections({ battles, campaignId }: { battles: Battle[]; campaignId: string }) {
  const t = useTranslations("battleSetup.list");

  const { search, sections } = useBattleListSections(battles);

  if (battles.length === 0) {
    return (
      <EmptyState
        className="bg-hud-panel"
        icon={Swords}
        title={t("empty.title")}
        action={
          <Link href={`/campaigns/${campaignId}/dm/battles/new`}>
            <Button>{t("empty.create")}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <SearchInput value={search.query.value} onChange={search.query.set} label={t("search")} />
      {sections.length === 0 && <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />}
      {sections.map(({ kind, title, battles: list }) => (
        <HudPanel key={kind}>
          <HudSection title={title}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map((battle) => (
                <BattleListCard key={battle.id} battle={battle} campaignId={campaignId} kind={kind} />
              ))}
            </div>
          </HudSection>
        </HudPanel>
      ))}
    </>
  );
}
