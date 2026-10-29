"use client";
import { useState } from "react";

import { ActionBar } from "@/components/common/ActionBar";
import { PagerNav } from "@/components/common/PagerNav";
import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { COMPENDIUM_PAGE_SIZES, COMPENDIUM_REF_KINDS } from "@/lib/constants/compendium-import";
import { usePager } from "@/lib/hooks/common";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { editionLabel, kindLabel, summaryLines } from "@/lib/utils/compendium-import/labels";
import type { CompendiumGraphRow } from "@/types/compendium-import";

type Ref = CompendiumGraphRow["refs"][number];

export function CompendiumDependencies({ wizard }: { wizard: CompendiumImportController }) {
  const t = useTranslator("compendium");

  const { preview, options, targets, busy } = wizard.state;

  const { applyOptions, excludeRow, excludeBlockedRows } = wizard.actions;

  const [showAll, setShowAll] = useState(false);

  const all = preview?.graph ?? [];

  const statusByKey = new Map((preview?.report.rows ?? []).map(row => [row.canonicalKey, row.status]));

  const needsAttention = (row: CompendiumGraphRow) => row.refs.some(ref => ref.unresolved) || (statusByKey.get(row.key) ?? "create") !== "unchanged";

  const shown = showAll ? all : all.filter(needsAttention);

  const hiddenCount = all.length - all.filter(needsAttention).length;

  const pager = usePager(shown, COMPENDIUM_PAGE_SIZES.graph);

  if (!preview) return null;

  const choices = (ref: Ref) => [
    ...targets.local.flatMap((target, i) => target.kind === COMPENDIUM_REF_KINDS[ref.kind] ? [{ value: `local:0:${i}`, label: t("dependencies.campaignOption", { name: target.name }) }] : []),
    ...targets.templates.flatMap((template, ti) => template.rows.flatMap((target, i) => target.kind === COMPENDIUM_REF_KINDS[ref.kind] ? [{ value: `template:${ti}:${i}`, label: `${template.name}: ${target.name} (${template.edition})` }] : [])),
  ];

  const bind = (ref: Ref, value: string) => {
    if (!value) return;

    const [location, templateIndex, targetIndex] = value.split(":");

    const template = targets.templates[Number(templateIndex)];

    const target = location === "local" ? targets.local[Number(targetIndex)] : template.rows[Number(targetIndex)];

    const bindings = { ...options.bindings };

    delete bindings[ref.key];

    const dependencies = (options.dependencies ?? []).filter(choice => choice.refKey !== ref.key);

    if (location === "local") bindings[ref.key] = { kind: target.kind, id: target.id };
    else dependencies.push({ refKey: ref.key, templateId: template.id, kind: target.kind, localId: target.id, edition: template.edition });

    applyOptions({ ...options, bindings, dependencies });
  };

  const overwrite = (key: string, on: boolean) => applyOptions({ ...options, overwriteKeys: on ? [...(options.overwriteKeys ?? []), key] : options.overwriteKeys?.filter(item => item !== key) });

  const refBlock = (ref: Ref) => <div key={ref.key}><p className="text-hud-muted">{t("dependencies.dependency", { kind: kindLabel(t, ref.kind), name: ref.name })}{[ref.source, editionLabel(t, ref.edition)].filter(Boolean).map(part => ` · ${part}`).join("")}{!ref.unresolved && ` — ${t("dependencies.matched")}`}</p><SelectField aria-label={t("dependencies.bindingLabel", { name: ref.name })} value="" disabled={busy} className="max-w-full" placeholder={t(ref.unresolved ? "dependencies.unresolvedPlaceholder" : "dependencies.changePlaceholder")} options={choices(ref)} onValueChange={value => bind(ref, value)} /></div>;

  return <div className="space-y-3">
    <details open className="text-sm"><summary className="cursor-pointer text-hud-gold">{hiddenCount > 0 && !showAll ? t("dependencies.titleCountOf", { shown: shown.length, total: all.length }) : t("dependencies.titleCount", { shown: shown.length })}</summary>
      <div className="my-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{pager.pageItems.map(row => <div className="flex min-w-0 flex-col gap-2 break-words rounded-lg bg-[rgba(20,16,12,.85)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]" key={row.key}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="hud-sc min-w-0 text-[15px] text-hud-ink">{row.name}</strong><span className="text-xs text-hud-muted">{kindLabel(t, row.kind)}</span>{row.refs.some(ref => ref.unresolved) ? <HudPill tone="accent">{t("dependencies.needsBinding")}</HudPill> : <HudPill tone="muted">{t(row.refs.length > 0 ? "dependencies.matched" : "dependencies.noRefs")}</HudPill>}</div>
        {row.refs.filter(ref => ref.unresolved).map(refBlock)}
        <details className="mt-auto"><summary className="cursor-pointer text-xs text-hud-muted">{t("dependencies.more")}</summary>
          <div className="mt-2 space-y-2">
            {summaryLines(t, row.summary).map(line => <p className="text-xs text-hud-muted" key={line}>{line}</p>)}
            {row.refs.filter(ref => !ref.unresolved).map(refBlock)}
            <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={options.overwriteKeys?.includes(row.key) ?? false} onChange={e => overwrite(row.key, e.target.checked)} /> {t("dependencies.overwrite")}</label>
            <Button variant="outline" size="sm" onClick={() => excludeRow(row.key)}>{t("dependencies.exclude")}</Button>
          </div>
        </details>
      </div>)}</div>
      <PagerNav pager={pager} labels={{ prev: t("dependencies.prev"), next: t("dependencies.next") }} />
      {hiddenCount > 0 && <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>{showAll ? t("dependencies.onlyActionable") : t("dependencies.showHidden", { count: hiddenCount })}</Button>}
    </details>
    {!preview.report.readyToImport && <ActionBar><Button className="h-auto whitespace-normal" disabled={busy} onClick={excludeBlockedRows}>{t("dependencies.excludeBlocked")}</Button></ActionBar>}
  </div>;
}
