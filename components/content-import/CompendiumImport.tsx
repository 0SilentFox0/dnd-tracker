"use client";
import Link from "next/link";

import { CompendiumCategories } from "./CompendiumCategories";
import { CompendiumDependencies } from "./CompendiumDependencies";
import { CompendiumFileStep } from "./CompendiumFileStep";
import { CompendiumReport } from "./CompendiumReport";
import { CompendiumRunsList } from "./CompendiumRunsList";
import { RulesPatchOffer } from "./RulesPatchOffer";

import { ActionBar } from "@/components/common/ActionBar";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useCompendiumImport } from "@/lib/hooks/compendium-import";

export function CompendiumImport({ campaignId, initialFile }: { campaignId: string; initialFile?: File }) {
  const wizard = useCompendiumImport(campaignId, initialFile);

  const { preview, input, result, rights, busy, root } = wizard.state;

  const { setRights, confirm, close } = wizard.actions;

  return <HudPage>
    <HudPageHeader
      title="Імпорт JSON-компендіуму"
      subtitle="Один файл → перевірка → підтвердження. До підтвердження кампанія не змінюється."
      actions={<Button variant="outline" asChild><Link href={`/campaigns/${campaignId}`}>До кампанії</Link></Button>}
    />
    <CompendiumFileStep wizard={wizard} />
    {root && <CompendiumCategories wizard={wizard} />}
    {preview && <>
      <HudPanel className="space-y-3"><RulesPatchOffer wizard={wizard} /><CompendiumReport campaignId={campaignId} report={preview.report} /></HudPanel>
      <HudPanel className="space-y-3"><CompendiumDependencies key={preview.token} wizard={wizard} /></HudPanel>
      <HudPanel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-0 items-start gap-2 text-sm"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} /> Маю право використати цей файл у цій кампанії</label>
          <Button disabled={busy || !rights || !preview.report.readyToImport} onClick={() => void confirm()}>Імпортувати</Button>
        </div>
        <p className="text-xs text-hud-muted">Перевірка чинна 15 хв; після змін кампанії чи вибору потрібна нова.</p>
      </HudPanel>
    </>}
    {result && <HudPanel className="space-y-3"><p className="text-hud-good">Імпорт збережено: {result.runId}</p><CompendiumReport key={result.runId} campaignId={campaignId} report={result} committed /></HudPanel>}
    <CompendiumRunsList campaignId={campaignId} wizard={wizard} />
    <ActionBar><Button variant="outline" disabled={busy && !!input} onClick={close}>Очистити файл і закрити майстер</Button></ActionBar>
  </HudPage>;
}
