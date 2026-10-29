"use client";
import { CategoryChip } from "./CategoryChip";
import { CompendiumAdvanced } from "./CompendiumAdvanced";
import { CompendiumMaterials } from "./CompendiumMaterials";

import { ActionBar } from "@/components/common/ActionBar";
import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { allKinds, chapterBlocks, estimateRecords, groupInventory, recommendedKinds } from "@/lib/utils/compendium-import/categories";
import { CATEGORY_LABELS } from "@/lib/utils/compendium-import/flow";

export function CompendiumCategories({ wizard }: { wizard: CompendiumImportController }) {
  const { root, categories, excludedChapters, busy } = wizard.state;

  const { toggleCategory, selectCategories, setChapterExclusions, runPreview } = wizard.actions;

  if (!root) return null;

  const { groups, skipped } = groupInventory(root);

  const blocks = chapterBlocks(root, categories);

  const records = estimateRecords(root, categories, excludedChapters);

  return <HudPanel className="space-y-4">
    <HudSection title="Категорії · матеріали ДМ оберіть явно" action={<div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => selectCategories(allKinds(root))}>Усе</Button>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => selectCategories([])}>Нічого</Button>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => selectCategories(recommendedKinds(root))}>Рекомендоване</Button>
    </div>}>
      <fieldset disabled={busy} className="space-y-3">
        {groups.map(group => <div key={group.id} data-group={group.id}>
          <p className="mb-1 text-xs uppercase tracking-wide text-hud-muted">{group.title}</p>
          <div className="flex flex-wrap gap-2">{group.rows.map(row => <CategoryChip key={row.kind} label={CATEGORY_LABELS[row.kind] ?? row.kind} count={row.count} checked={categories.includes(row.kind)} disabled={busy} onChange={on => toggleCategory(row.kind, on)} />)}</div>
        </div>)}
      </fieldset>
    </HudSection>
    {skipped.length > 0 && <details className="text-sm text-hud-muted">
      <summary className="cursor-pointer">Пропущено: {skipped.length} технічних категорій (зображення/Foundry не завантажуються)</summary>
      <ul className="mt-1 flex flex-wrap gap-x-3 text-xs">{skipped.map(row => <li key={row.kind}>{CATEGORY_LABELS[row.kind] ?? row.kind} ({row.count})</li>)}</ul>
    </details>}
    <CompendiumMaterials blocks={blocks} excluded={excludedChapters} busy={busy} onChange={setChapterExclusions} />
    <CompendiumAdvanced root={root} wizard={wizard} />
    <ActionBar>
      <p className="self-center text-sm text-hud-muted" data-testid="import-summary">Обрано {categories.length} категорій, ≈{records} записів</p>
      <Button disabled={busy || !categories.length} onClick={() => void runPreview()}>Перевірити JSON</Button>
    </ActionBar>
  </HudPanel>;
}
