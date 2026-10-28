"use client";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMPENDIUM_CHAPTER_KINDS } from "@/lib/constants/compendium-import";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { CATEGORY_LABELS, categoryInventory } from "@/lib/utils/compendium-import/flow";

type Book = { id?: string; name?: string; data?: Array<{ name?: string }> };

type SourcedRow = { source?: string; name?: string };

export function CompendiumCategories({ wizard }: { wizard: CompendiumImportController }) {
  const { root, categories, excludedChapters, options, busy } = wizard.state;

  const { toggleCategory, toggleChapter, changeOptions, runPreview } = wizard.actions;

  if (!root) return null;

  const chapterKinds = categories.filter(kind => (COMPENDIUM_CHAPTER_KINDS as readonly string[]).includes(kind));

  const setBinding = (path: string, value: string) => {
    const bindings = { ...options.sourceBindings };

    if (value) bindings[path] = value; else delete bindings[path];

    changeOptions({ ...options, sourceBindings: bindings });
  };

  return <>
    <HudSection title="Категорії · матеріали ДМ оберіть явно">
      <fieldset disabled={busy} className="space-y-2">
        {categoryInventory(root).map(row => <label className="block" key={row.kind}><input type="checkbox" checked={categories.includes(row.kind)} disabled={!row.supported} onChange={e => toggleCategory(row.kind, e.target.checked)} /> {CATEGORY_LABELS[row.kind] ?? row.kind} ({row.count}){!row.supported && " — не підтримується; пропущено, зображення/Foundry не завантажуються"}</label>)}
      </fieldset>
    </HudSection>
    {chapterKinds.length > 0 && <details><summary>Обрати розділи матеріалів ДМ</summary>{chapterKinds.flatMap(kind => (root[kind] as Book[]).map((book, index) => <div key={`${kind}:${index}`}><p>{book.name ?? book.id ?? kind}</p>{(book.data ?? []).map((chapter, chapterIndex) => {
      const path = `${kind}[${index}].data[${chapterIndex}]`;

      return <label className="block" key={chapterIndex}><input type="checkbox" checked={!excludedChapters.includes(path)} disabled={busy} onChange={e => toggleChapter(path, e.target.checked)} /> {chapter.name ?? `Розділ ${chapterIndex + 1}`}</label>;
    })}</div>))}</details>}
    <details><summary>Джерела та явні зіставлення source</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(root._meta ?? {}, null, 2)}</pre>
      {categories.flatMap(kind => (Array.isArray(root[kind]) ? root[kind] as SourcedRow[] : []).map((row, index) => !row.source && <label className="block" key={`${kind}:${index}`}>{row.name ?? `${kind}[${index}]`} → source JSON id<Input className="ml-2" value={options.sourceBindings?.[`${kind}[${index}]`] ?? ""} placeholder="Джерело для запису без source" onChange={e => setBinding(`${kind}[${index}]`, e.target.value)} /></label>))}
    </details>
    <label className="block"><input type="checkbox" checked={options.allowMixedEdition ?? false} disabled={busy} onChange={e => changeOptions({ ...options, allowMixedEdition: e.target.checked })} /> Дозволяю явне змішування classic / one (без конвертації правил)</label>
    <label className="block"><input type="checkbox" checked={!!options.rulesPatch} disabled={busy} onChange={e => changeOptions({ ...options, rulesPatch: e.target.checked ? { classes: { enabled: true } } : undefined })} /> Увімкнути класи 5e в правилах кампанії</label>
    <p>Зміни правил: {options.rulesPatch ? JSON.stringify(options.rulesPatch) : "немає"}. Інші налаштування — в редакторі правил.</p>
    <Button disabled={busy || !categories.length} onClick={() => void runPreview()}>Перевірити JSON</Button>
  </>;
}
