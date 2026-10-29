"use client";
import { useTranslations } from "next-intl";

import { PagerNav } from "@/components/common/PagerNav";
import { FormAlert } from "@/components/common/states";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useCompendiumReports } from "@/lib/hooks/compendium-import";

export function CompendiumRunsList({ campaignId, wizard }: { campaignId: string; wizard: CompendiumImportController }) {
  const t = useTranslations("compendium.runs");

  const { runs, pager, isError } = useCompendiumReports(campaignId);

  return <HudPanel className="space-y-3">
    <h2 className="hud-sc text-base text-hud-ink">{t("title")}</h2>
    {isError && <FormAlert>{t("loadFailed")}</FormAlert>}
    <div className="flex flex-wrap gap-2">{runs.map(run => <Button variant="outline" size="sm" className="h-auto max-w-full whitespace-normal break-all" key={run.id} onClick={() => void wizard.actions.openRun(run)}>{t("report", { id: run.id })}</Button>)}</div>
    <PagerNav pager={pager} labels={{ prev: t("prev"), next: t("next") }} />
  </HudPanel>;
}
