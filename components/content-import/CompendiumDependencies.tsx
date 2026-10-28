"use client";
import { ActionBar } from "@/components/common/ActionBar";
import { PagerNav } from "@/components/common/PagerNav";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { COMPENDIUM_PAGE_SIZES, COMPENDIUM_REF_KINDS } from "@/lib/constants/compendium-import";
import { usePager } from "@/lib/hooks/common";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import type { CompendiumGraphRow } from "@/types/compendium-import";

type Ref = CompendiumGraphRow["refs"][number];

export function CompendiumDependencies({ wizard }: { wizard: CompendiumImportController }) {
  const { preview, options, targets, busy } = wizard.state;

  const { changeOptions, excludeRow, excludeBlockedRows } = wizard.actions;

  const pager = usePager(preview?.graph ?? [], COMPENDIUM_PAGE_SIZES.graph);

  if (!preview) return null;

  const choices = (ref: Ref) => [
    ...targets.local.flatMap((target, i) => target.kind === COMPENDIUM_REF_KINDS[ref.kind] ? [{ value: `local:0:${i}`, label: `Кампанія: ${target.name}` }] : []),
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

    changeOptions({ ...options, bindings, dependencies });
  };

  const overwrite = (key: string, on: boolean) => changeOptions({ ...options, overwriteKeys: on ? [...(options.overwriteKeys ?? []), key] : options.overwriteKeys?.filter(item => item !== key) });

  return <div className="space-y-3">
    <details open className="text-sm"><summary className="cursor-pointer text-hud-gold">Посилання, залежності й конфлікти</summary>
      {pager.pageItems.map(row => <div className="my-3 space-y-2 break-words rounded-lg border border-hud-rule p-3" key={row.key}><strong>{row.name} · {row.kind}</strong>
        {row.summary !== undefined && <pre className="whitespace-pre-wrap break-words text-xs text-hud-muted">{JSON.stringify(row.summary, null, 2)}</pre>}
        {row.refs.map(ref => <div key={ref.key}><p className="text-hud-muted">Залежність: {ref.name} · {ref.source} · {ref.edition}</p><SelectField aria-label={`Зіставлення ${ref.name}`} value="" disabled={busy} className="max-w-full" placeholder="Оберіть запис кампанії або залежність SRD…" options={choices(ref)} onValueChange={value => bind(ref, value)} /></div>)}
        {row.refs.length === 0 && <p>Механічних залежностей немає</p>}
        <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={options.overwriteKeys?.includes(row.key) ?? false} onChange={e => overwrite(row.key, e.target.checked)} /> Перезаписати локальні зміни (типово зберігаються)</label>
        <Button variant="outline" size="sm" onClick={() => excludeRow(row.key)}>Виключити запис</Button>
      </div>)}
      <PagerNav pager={pager} labels={{ prev: "Попередні залежності", next: "Наступні залежності" }} />
    </details>
    {!preview.report.readyToImport && <ActionBar><Button className="h-auto whitespace-normal" disabled={busy} onClick={excludeBlockedRows}>Виключити заблоковані та залежні й перевірити решту</Button></ActionBar>}
  </div>;
}
