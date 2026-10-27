"use client";

import Link from "next/link";
import { Layers } from "lucide-react";

import { ArtifactSetCard } from "@/components/artifact-sets/ArtifactSetCard";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useArtifactSetsPage } from "@/lib/hooks/artifact-sets";

export function DMArtifactSetsPageClient({ campaignId: id }: { campaignId: string }) {
  const { sets, total, search } = useArtifactSetsPage(id);

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

      {total === 0 ? (
        <EmptyState
          className="bg-hud-panel"
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
        <>
          <SearchInput value={search.query.value} onChange={search.query.set} label="Пошук сетів" />
          {sets.length === 0 ? (
            <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sets.map((s) => (
                <ArtifactSetCard
                  key={s.id}
                  variant="summary"
                  campaignId={id}
                  set={{ ...s, icon: s.icon ?? null, abilitySummary: s.abilitySummary ?? [] }}
                  artifacts={s.artifacts ?? []}
                />
              ))}
            </div>
          )}
        </>
      )}
    </HudPage>
  );
}
