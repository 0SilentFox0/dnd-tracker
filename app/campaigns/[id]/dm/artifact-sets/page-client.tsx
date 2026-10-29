"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";

import { ArtifactSetCard } from "@/components/artifact-sets/ArtifactSetCard";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useArtifactSetsPage } from "@/lib/hooks/artifact-sets";

export function DMArtifactSetsPageClient({ campaignId: id }: { campaignId: string }) {
  const t = useTranslations("artifacts.sets.page");

  const { sets, total, search } = useArtifactSetsPage(id);

  return (
    <HudPage>
      <HudPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <ContentTransferButtons campaignId={id} kind="artifact-sets" />
            <Button asChild>
              <Link href={`/campaigns/${id}/dm/artifact-sets/new`}>
                {t("new")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/campaigns/${id}/dm/artifacts`}>{t("toArtifacts")}</Link>
            </Button>
          </>
        }
      />

      {total === 0 ? (
        <EmptyState
          className="bg-hud-panel"
          icon={Layers}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button asChild>
              <Link href={`/campaigns/${id}/dm/artifact-sets/new`}>{t("createFirst")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <SearchInput value={search.query.value} onChange={search.query.set} label={t("searchLabel")} />
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
