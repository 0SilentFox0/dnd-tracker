"use client";
import { Input } from "@/components/ui/input";
import type { JsonRecord } from "@/lib/constants/compendium-import";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { describeRulesPatch, metaSummary } from "@/lib/utils/compendium-import/labels";

type SourcedRow = { source?: string; name?: string };

function MetaSummary({ meta }: { meta: unknown }) {
  const t = useTranslator("compendium");

  const { sources, edition } = metaSummary(t, meta);

  return <div className="text-xs text-hud-muted">{edition && <p>{t("categoriesStep.edition", { edition })}</p>}<ul>{sources.map((source, i) => <li key={i}>{source}</li>)}</ul></div>;
}

export const advancedActive = (options: CompendiumImportController["state"]["options"]) => !!options.allowMixedEdition || !!options.rulesPatch || Object.keys(options.sourceBindings ?? {}).length > 0;

export function CompendiumAdvanced({ root, wizard }: { root: JsonRecord; wizard: CompendiumImportController }) {
  const t = useTranslator("compendium");

  const { categories, options, busy } = wizard.state;

  const { changeOptions } = wizard.actions;

  const setBinding = (path: string, value: string) => {
    const bindings = { ...options.sourceBindings };

    if (value) bindings[path] = value; else delete bindings[path];

    changeOptions({ ...options, sourceBindings: bindings });
  };

  return <details className="rounded-lg border border-hud-rule p-2 text-sm">
    <summary className="cursor-pointer text-hud-gold">{t("advanced.title")}{advancedActive(options) && <span className="ml-2 text-hud-good">{t("advanced.active")}</span>}</summary>
    <div className="mt-2 space-y-3">
      <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={options.allowMixedEdition ?? false} disabled={busy} onChange={e => changeOptions({ ...options, allowMixedEdition: e.target.checked })} /> {t("categoriesStep.mixedEdition")}</label>
      <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!!options.rulesPatch} disabled={busy} onChange={e => changeOptions({ ...options, rulesPatch: e.target.checked ? { classes: { enabled: true } } : undefined })} /> {t("categoriesStep.enableClasses")}</label>
      <p className="text-hud-muted">{t("categoriesStep.rulesChanges", { summary: describeRulesPatch(t, options.rulesPatch) })}</p>
      <details><summary className="cursor-pointer text-hud-gold">{t("categoriesStep.sources")}</summary><MetaSummary meta={root._meta} />
        {categories.flatMap(kind => (Array.isArray(root[kind]) ? root[kind] as SourcedRow[] : []).map((row, index) => !row.source && <label className="my-2 block" key={`${kind}:${index}`}>{t("categoriesStep.sourceBinding", { name: row.name ?? `${kind}[${index}]` })}<Input className="mt-1" value={options.sourceBindings?.[`${kind}[${index}]`] ?? ""} placeholder={t("categoriesStep.sourcePlaceholder")} onChange={e => setBinding(`${kind}[${index}]`, e.target.value)} /></label>))}
      </details>
    </div>
  </details>;
}
