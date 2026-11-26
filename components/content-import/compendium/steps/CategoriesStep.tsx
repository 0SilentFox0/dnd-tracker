'use client';
import { CategoryChip } from '../../shared/CategoryChip';
import { CompendiumAdvanced } from '../CompendiumAdvanced';
import { CompendiumMaterials } from '../CompendiumMaterials';

import { HudSection } from '@/components/hud/form';
import { HudSegmented } from '@/components/hud/HudSegmented';
import { HudPanel } from '@/components/hud/page';
import { Disclosure } from '@/components/ui/disclosure';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    allKinds,
    chapterBlocks,
    groupInventory,
    recommendedKinds,
} from '@/lib/utils/compendium-import/categories';
import { categoryLabel } from '@/lib/utils/compendium-import/flow';

const PRESETS = ['all', 'none', 'recommended'] as const;

const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((kind) => b.includes(kind));

export function CategoriesStep({
    wizard,
}: {
    wizard: CompendiumImportController;
}) {
    const t = useTranslator('compendium');

    const { root, categories, excludedChapters, preview, busy } = wizard.state;

    const { toggleCategory, selectCategories, setChapterExclusions } =
        wizard.actions;

    if (!root) return null;

    const { groups, skipped } = groupInventory(root);

    const blocks = chapterBlocks(root, categories);

    const presets = {
        all: allKinds(root),
        none: [] as string[],
        recommended: recommendedKinds(root),
    };

    const preset =
        PRESETS.find((key) => sameSet(presets[key], categories)) ?? null;

    return (
        <HudPanel className="space-y-4">
            {preview && (
                <p className="ds-inset rounded-lg border border-hud-accent px-3 py-2 text-sm">
                    {t('wizard.resetNotice')}
                </p>
            )}
            <HudSection
                title={t('categoriesStep.title')}
                action={
                    <HudSegmented
                        id="compendium-presets"
                        label={t('categoriesStep.title')}
                        value={preset}
                        disabled={busy}
                        options={PRESETS.map((key) => ({
                            value: key,
                            label: t(`categoriesStep.${key}`),
                        }))}
                        onValueChange={(key) => selectCategories(presets[key])}
                    />
                }
            >
                <fieldset disabled={busy} className="space-y-3">
                    {groups.map((group) => (
                        <div key={group.id} data-group={group.id}>
                            <p className="mb-1 text-xs tracking-wide text-hud-muted uppercase">
                                {t(`categoriesStep.groups.${group.id}`)}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {group.rows.map((row) => (
                                    <CategoryChip
                                        key={row.kind}
                                        label={categoryLabel(t, row.kind)}
                                        count={row.count}
                                        checked={categories.includes(row.kind)}
                                        disabled={busy}
                                        onChange={(on) =>
                                            toggleCategory(row.kind, on)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </fieldset>
            </HudSection>
            {skipped.length > 0 && (
                <Disclosure
                    className="text-sm text-hud-muted"
                    summary={
                        <span>
                            {t('categoriesStep.skippedTechnical', {
                                count: skipped.length,
                            })}
                        </span>
                    }
                >
                    <ul className="mt-1 flex flex-wrap gap-x-3 text-xs">
                        {skipped.map((row) => (
                            <li key={row.kind}>
                                {t('categoriesStep.row', {
                                    label: categoryLabel(t, row.kind),
                                    count: row.count,
                                })}
                            </li>
                        ))}
                    </ul>
                </Disclosure>
            )}
            <CompendiumMaterials
                blocks={blocks}
                excluded={excludedChapters}
                busy={busy}
                onChange={setChapterExclusions}
            />
            <CompendiumAdvanced root={root} wizard={wizard} />
        </HudPanel>
    );
}
