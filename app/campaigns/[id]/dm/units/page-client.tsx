"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Skull } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { UnitGroupAccordion } from "@/components/units/list/UnitGroupAccordion";
import { UnitsToolbar } from "@/components/units/list/UnitsToolbar";
import { useUnitsList } from "@/lib/hooks/units";
import type { Unit } from "@/types/units";

interface DMUnitsPageClientProps {
  campaignId: string;
  initialUnits: Unit[];
}

export function DMUnitsPageClient({ campaignId, initialUnits }: DMUnitsPageClientProps) {
  const t = useTranslations("units");

  const list = useUnitsList(campaignId, initialUnits);

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle", { count: list.units.length })}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="units" />
            <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/races`}>{t("page.addRace")}</Link>
            </Button>
            <Button className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/units/new`}>{t("page.create")}</Link>
            </Button>
            <DeleteAllButton
              count={list.units.length}
              noun={t("deleteAll.noun")}
              confirm={{
                label: t("deleteAll.label"),
                description: t("deleteAll.description", { count: list.units.length }),
              }}
              actions={{ onConfirm: list.actions.removeAll }}
            />
          </>
        }
      >
        {list.units.length > 0 && (
          <UnitsToolbar
            query={list.filter.query}
            onSearch={list.filter.search}
            chips={list.view.chips}
            selected={list.filter.raceFilter}
            onToggle={list.filter.toggleRace}
            hideEmpty={{ value: list.filter.hideEmpty, onToggle: list.filter.toggleHideEmpty }}
          />
        )}
      </HudPageHeader>
      <OnboardingHint id="dm.units" />

      {list.isLoading && list.units.length === 0 ? (
        <LoadingState rows={6} label={t("page.loading")} />
      ) : list.units.length === 0 ? (
        <EmptyState icon={Skull} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />
      ) : list.view.groups.length === 0 ? (
        <p className="text-sm text-hud-muted">{t("page.nothingFound")}</p>
      ) : (
        <Accordion type="multiple" value={list.view.open} onValueChange={list.view.setOpen} className="space-y-2">
          {list.view.groups.map((group) => (
            <UnitGroupAccordion key={group.key} group={group} campaignId={campaignId} onDeleteUnit={list.actions.deleteUnit} onDrop={list.actions.drop} />
          ))}
        </Accordion>
      )}
    </HudPage>
  );
}
