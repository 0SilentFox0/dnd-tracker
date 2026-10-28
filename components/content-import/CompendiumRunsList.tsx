"use client";
import { PagerNav } from "@/components/common/PagerNav";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useCompendiumReports } from "@/lib/hooks/compendium-import";

export function CompendiumRunsList({ campaignId, wizard }: { campaignId: string; wizard: CompendiumImportController }) {
  const { runs, pager, isError } = useCompendiumReports(campaignId);

  return <details open><summary>Збережені звіти</summary>
    {isError && <p role="alert">Не вдалося завантажити збережені звіти</p>}
    {runs.map(run => <button className="m-2 underline" key={run.id} onClick={() => void wizard.actions.openRun(run)}>Звіт {run.id}</button>)}
    <PagerNav pager={pager} labels={{ prev: "Попередні звіти", next: "Наступні звіти" }} />
  </details>;
}
