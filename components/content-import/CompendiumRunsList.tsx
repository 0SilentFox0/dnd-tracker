"use client";
import { PagerNav } from "@/components/common/PagerNav";
import { FormAlert } from "@/components/common/states";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useCompendiumReports } from "@/lib/hooks/compendium-import";

export function CompendiumRunsList({ campaignId, wizard }: { campaignId: string; wizard: CompendiumImportController }) {
  const { runs, pager, isError } = useCompendiumReports(campaignId);

  return <HudPanel className="space-y-3">
    <h2 className="hud-sc text-base text-hud-ink">Збережені звіти</h2>
    {isError && <FormAlert>Не вдалося завантажити збережені звіти</FormAlert>}
    <div className="flex flex-wrap gap-2">{runs.map(run => <Button variant="outline" size="sm" className="h-auto max-w-full whitespace-normal break-all" key={run.id} onClick={() => void wizard.actions.openRun(run)}>Звіт {run.id}</Button>)}</div>
    <PagerNav pager={pager} labels={{ prev: "Попередні звіти", next: "Наступні звіти" }} />
  </HudPanel>;
}
