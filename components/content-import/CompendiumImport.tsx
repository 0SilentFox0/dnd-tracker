"use client";
import { CompendiumCategories } from "./CompendiumCategories";
import { CompendiumDependencies } from "./CompendiumDependencies";
import { CompendiumFileStep } from "./CompendiumFileStep";
import { CompendiumReport } from "./CompendiumReport";
import { CompendiumRunsList } from "./CompendiumRunsList";

import { Button } from "@/components/ui/button";
import { useCompendiumImport } from "@/lib/hooks/compendium-import";

export function CompendiumImport({ campaignId, initialFile }: { campaignId: string; initialFile?: File }) {
  const wizard = useCompendiumImport(campaignId, initialFile);

  const { preview, input, result, rights, busy, root } = wizard.state;

  const { setRights, confirm, close } = wizard.actions;

  return <div className="mx-auto max-w-5xl space-y-5 p-4">
    <CompendiumFileStep wizard={wizard} />
    {root && <CompendiumCategories wizard={wizard} />}
    {preview && <>
      <CompendiumReport campaignId={campaignId} report={preview.report} />
      <CompendiumDependencies key={preview.token} wizard={wizard} />
      <label className="block"><input type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} /> Маю право використати цей файл у цій кампанії</label>
      <p>Preview чинний 15 хвилин. Після змін кампанії або вибору потрібна нова перевірка.</p>
      <Button disabled={busy || !rights || !preview.report.readyToImport} onClick={() => void confirm()}>Імпортувати</Button>
    </>}
    {result && <><p>Імпорт збережено: {result.runId}</p><CompendiumReport key={result.runId} campaignId={campaignId} report={result} committed /></>}
    <CompendiumRunsList campaignId={campaignId} wizard={wizard} />
    <Button variant="outline" disabled={busy && !!input} onClick={close}>Очистити файл і закрити майстер</Button>
    <a className="ml-3 underline" href={`/campaigns/${campaignId}`}>До кампанії</a>
  </div>;
}
