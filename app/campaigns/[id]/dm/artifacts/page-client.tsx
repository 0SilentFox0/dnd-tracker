"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Gem } from "lucide-react";

import { ArtifactSetCard } from "@/components/artifact-sets/ArtifactSetCard";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { DeleteAllArtifactsButton } from "@/components/artifacts/DeleteAllArtifactsButton";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useArtifactsCatalog } from "@/lib/hooks/artifact-sets";

export function DMArtifactsPageClient({ campaignId }: { campaignId: string }) {
  const t = useTranslations("artifacts");

  const catalog = useArtifactsCatalog(campaignId);

  const { search } = catalog;

  const noResults = search.isActive && catalog.view.sets.length === 0 && catalog.view.bySlot.length === 0;

  const slotKeys = catalog.view.bySlot.map((g) => g.slot).join("|");

  const newHref = `/campaigns/${campaignId}/dm/artifacts/new`;

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="artifacts" />
            <DeleteAllArtifactsButton campaignId={campaignId} artifactsCount={catalog.count} />
            <Button variant="outline" className="whitespace-nowrap" asChild>
              <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>{t("page.setsLink")}</Link>
            </Button>
            <Button className="whitespace-nowrap" asChild>
              <Link href={newHref}>{t("page.create")}</Link>
            </Button>
          </>
        }
      />
      <OnboardingHint id="dm.artifacts" />

      {catalog.isLoading && catalog.isEmpty ? (
        <LoadingState rows={6} label={t("page.loading")} />
      ) : catalog.isEmpty ? (
        <EmptyState
          className="bg-hud-panel"
          icon={Gem}
          title={t("page.emptyTitle")}
          action={
            <Button asChild>
              <Link href={newHref}>{t("page.createFirst")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <SearchInput value={search.query.value} onChange={search.query.set} label={t("page.searchLabel")} placeholder={t("page.searchPlaceholder")} />
          {noResults && <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />}
          {catalog.view.sets.length > 0 && (
            <HudPanel>
              <HudSection title={t("page.setsSection")}>
                <div className="space-y-4">
                  {catalog.view.sets.map(({ set, artifacts }) => (
                    <ArtifactSetCard key={set.id} variant="withArtifacts" campaignId={campaignId} set={set} artifacts={artifacts} />
                  ))}
                </div>
              </HudSection>
            </HudPanel>
          )}

          {catalog.view.bySlot.length > 0 && (
            <HudPanel>
              <HudSection title={t("page.ungroupedSection")}>
                <Accordion key={search.isActive ? slotKeys : "all"} type="multiple" defaultValue={search.isActive ? catalog.view.bySlot.map((g) => g.slot) : []} className="w-full space-y-2">
                  {catalog.view.bySlot.map(({ slot, artifacts }) => (
                    <AccordionItem key={slot} value={slot} className="rounded-lg border last:border-b">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <span className="flex items-center gap-2">
                          {t(`slots.${slot}`)}
                          <Badge variant="secondary" className="text-xs">
                            {artifacts.length}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-3">
                        <div className="grid gap-3 pt-2 md:grid-cols-2 lg:grid-cols-3">
                          {artifacts.map((artifact) => (
                            <ArtifactCard key={artifact.id} campaignId={campaignId} artifact={artifact} variant="full" />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </HudSection>
            </HudPanel>
          )}
        </>
      )}
    </HudPage>
  );
}
