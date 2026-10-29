"use client";
import { ActionBar } from "@/components/common/ActionBar";
import { PagerNav } from "@/components/common/PagerNav";
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

  const pager = usePager(preview?.graph ?? [], COMPENDIUM_PAGE_SIZES.graph);

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

  return <div className="space-y-3">
    <details open className="text-sm"><summary className="cursor-pointer text-hud-gold">{t("dependencies.title")}</summary>
      {pager.pageItems.map(row => <div className="my-3 space-y-2 break-words rounded-lg border border-hud-rule p-3" key={row.key}><strong>{kindLabel(t, row.kind)} «{row.name}»</strong>
        {summaryLines(t, row.summary).map(line => <p className="text-xs text-hud-muted" key={line}>{line}</p>)}
        {row.refs.map(ref => <div key={ref.key}><p className="text-hud-muted">{t("dependencies.dependency", { kind: kindLabel(t, ref.kind), name: ref.name })}{[ref.source, editionLabel(t, ref.edition)].filter(Boolean).map(part => ` · ${part}`).join("")}{!ref.unresolved && ` — ${t("dependencies.matched")}`}</p><SelectField aria-label={t("dependencies.bindingLabel", { name: ref.name })} value="" disabled={busy} className="max-w-full" placeholder={t(ref.unresolved ? "dependencies.unresolvedPlaceholder" : "dependencies.changePlaceholder")} options={choices(ref)} onValueChange={value => bind(ref, value)} /></div>)}
        {row.refs.length === 0 && <p>{t("dependencies.none")}</p>}
        <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={options.overwriteKeys?.includes(row.key) ?? false} onChange={e => overwrite(row.key, e.target.checked)} /> {t("dependencies.overwrite")}</label>
        <Button variant="outline" size="sm" onClick={() => excludeRow(row.key)}>{t("dependencies.exclude")}</Button>
      </div>)}
      <PagerNav pager={pager} labels={{ prev: t("dependencies.prev"), next: t("dependencies.next") }} />
    </details>
    {!preview.report.readyToImport && <ActionBar><Button className="h-auto whitespace-normal" disabled={busy} onClick={excludeBlockedRows}>{t("dependencies.excludeBlocked")}</Button></ActionBar>}
  </div>;
}
