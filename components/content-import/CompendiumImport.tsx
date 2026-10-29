"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { CompendiumCategories } from "./CompendiumCategories";
import { CompendiumDependencies } from "./CompendiumDependencies";
import { CompendiumFileStep } from "./CompendiumFileStep";
import { CompendiumReport, DEPENDENCIES_ANCHOR } from "./CompendiumReport";
import { CompendiumRunsList } from "./CompendiumRunsList";
import { RulesPatchOffer } from "./RulesPatchOffer";

import { ActionBar } from "@/components/common/ActionBar";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useCompendiumImport } from "@/lib/hooks/compendium-import";

export function CompendiumImport({ campaignId, initialFile }: { campaignId: string; initialFile?: File }) {
  const t = useTranslations("compendium.import");

  const wizard = useCompendiumImport(campaignId, initialFile);

  const { preview, input, result, rights, busy, root, options } = wizard.state;

  const { setRights, confirm, close, applyOptions } = wizard.actions;

  return <HudPage>
    <HudPageHeader
      title={t("title")}
      subtitle={t("subtitle")}
      actions={<Button variant="outline" asChild><Link href={`/campaigns/${campaignId}`}>{t("back")}</Link></Button>}
    />
    <CompendiumFileStep wizard={wizard} />
    {root && <CompendiumCategories wizard={wizard} />}
    {preview && <>
      <HudPanel className="space-y-3"><RulesPatchOffer wizard={wizard} /><CompendiumReport campaignId={campaignId} report={preview.report} blockerActions={{ busy, allowMixedEdition: options.allowMixedEdition ? undefined : () => applyOptions({ ...options, allowMixedEdition: true }) }} /></HudPanel>
      <HudPanel className="space-y-3"><span id={DEPENDENCIES_ANCHOR} /><CompendiumDependencies key={preview.token} wizard={wizard} /></HudPanel>
      <HudPanel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-0 items-start gap-2 text-sm"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} /> {t("rights")}</label>
          <Button disabled={busy || !rights || !preview.report.readyToImport} onClick={() => void confirm()}>{t("confirm")}</Button>
        </div>
        <p className="text-xs text-hud-muted">{t("previewTtl")}</p>
      </HudPanel>
    </>}
    {result && <HudPanel className="space-y-3"><p className="text-hud-good">{t("saved", { runId: result.runId ?? "" })}</p><CompendiumReport key={result.runId} campaignId={campaignId} report={result} committed /></HudPanel>}
    <CompendiumRunsList campaignId={campaignId} wizard={wizard} />
    <ActionBar><Button variant="outline" disabled={busy && !!input} onClick={close}>{t("close")}</Button></ActionBar>
  </HudPage>;
}
