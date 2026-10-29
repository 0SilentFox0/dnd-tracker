"use client";
import { ActionBar } from "@/components/common/ActionBar";
import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMPENDIUM_CHAPTER_KINDS } from "@/lib/constants/compendium-import";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { categoryInventory, categoryLabel } from "@/lib/utils/compendium-import/flow";
import { describeRulesPatch, metaSummary } from "@/lib/utils/compendium-import/labels";

type Book = { id?: string; name?: string; data?: Array<{ name?: string }> };

type SourcedRow = { source?: string; name?: string };

function MetaSummary({ meta }: { meta: unknown }) {
  const t = useTranslator("compendium");

  const { sources, edition } = metaSummary(t, meta);

  return <div className="text-xs text-hud-muted">{edition && <p>{t("categoriesStep.edition", { edition })}</p>}<ul>{sources.map((source, i) => <li key={i}>{source}</li>)}</ul></div>;
}

export function CompendiumCategories({ wizard }: { wizard: CompendiumImportController }) {
  const t = useTranslator("compendium");

  const { root, categories, excludedChapters, options, busy } = wizard.state;

  const { toggleCategory, toggleChapter, changeOptions, runPreview } = wizard.actions;

  if (!root) return null;

  const chapterKinds = categories.filter(kind => (COMPENDIUM_CHAPTER_KINDS as readonly string[]).includes(kind));

  const setBinding = (path: string, value: string) => {
    const bindings = { ...options.sourceBindings };

    if (value) bindings[path] = value; else delete bindings[path];

    changeOptions({ ...options, sourceBindings: bindings });
  };

  return <HudPanel className="space-y-4">
    <HudSection title={t("categoriesStep.title")}>
      <fieldset disabled={busy} className="space-y-2">
        {categoryInventory(root).map(row => <label className="flex items-start gap-2 text-sm" key={row.kind}><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={categories.includes(row.kind)} disabled={!row.supported} onChange={e => toggleCategory(row.kind, e.target.checked)} /> {t("categoriesStep.row", { label: categoryLabel(t, row.kind), count: row.count })}{!row.supported && ` — ${t("categoriesStep.unsupported")}`}</label>)}
      </fieldset>
    </HudSection>
    {chapterKinds.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-hud-gold">{t("categoriesStep.chapters")}</summary>{chapterKinds.flatMap(kind => (root[kind] as Book[]).map((book, index) => <div className="my-2 space-y-1" key={`${kind}:${index}`}><p className="text-hud-muted">{book.name ?? book.id ?? kind}</p>{(book.data ?? []).map((chapter, chapterIndex) => {
      const path = `${kind}[${index}].data[${chapterIndex}]`;

      return <label className="flex items-start gap-2" key={chapterIndex}><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!excludedChapters.includes(path)} disabled={busy} onChange={e => toggleChapter(path, e.target.checked)} /> {chapter.name ?? t("categoriesStep.chapterDefault", { n: chapterIndex + 1 })}</label>;
    })}</div>))}</details>}
    <details className="text-sm"><summary className="cursor-pointer text-hud-gold">{t("categoriesStep.sources")}</summary><MetaSummary meta={root._meta} />
      {categories.flatMap(kind => (Array.isArray(root[kind]) ? root[kind] as SourcedRow[] : []).map((row, index) => !row.source && <label className="my-2 block" key={`${kind}:${index}`}>{t("categoriesStep.sourceBinding", { name: row.name ?? `${kind}[${index}]` })}<Input className="mt-1" value={options.sourceBindings?.[`${kind}[${index}]`] ?? ""} placeholder={t("categoriesStep.sourcePlaceholder")} onChange={e => setBinding(`${kind}[${index}]`, e.target.value)} /></label>))}
    </details>
    <label className="flex items-start gap-2 text-sm"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={options.allowMixedEdition ?? false} disabled={busy} onChange={e => changeOptions({ ...options, allowMixedEdition: e.target.checked })} /> {t("categoriesStep.mixedEdition")}</label>
    <label className="flex items-start gap-2 text-sm"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!!options.rulesPatch} disabled={busy} onChange={e => changeOptions({ ...options, rulesPatch: e.target.checked ? { classes: { enabled: true } } : undefined })} /> {t("categoriesStep.enableClasses")}</label>
    <p className="text-sm text-hud-muted">{t("categoriesStep.rulesChanges", { summary: describeRulesPatch(t, options.rulesPatch) })}</p>
    <ActionBar><Button disabled={busy || !categories.length} onClick={() => void runPreview()}>{t("categoriesStep.preview")}</Button></ActionBar>
  </HudPanel>;
}
