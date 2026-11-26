'use client';
import { CategoryChip } from '../../shared/CategoryChip';
import { advancedActive, CompendiumAdvanced } from './CompendiumAdvanced';
import { CompendiumMaterials } from './CompendiumMaterials';

import { HudSection } from '@/components/hud/form';
import { HudSegmented } from '@/components/hud/HudSegmented';
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

type Preset = 'recommended' | 'all' | 'none';

const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && b.every((kind) => a.includes(kind));

export function CategoriesStep({
    wizard,
}: {
    wizard: CompendiumImportController;
}) {
    const t = useTranslator('compendium');

    const { root, categories, excludedChapters, options, preview, busy } =
        wizard.state;

    const { toggleCategory, selectCategories, setChapterExclusions } =
        wizard.actions;

    if (!root) return null;

    const { groups, skipped } = groupInventory(root);

    const blocks = chapterBlocks(root, categories);

    const presets: Record<Preset, string[]> = {
        recommended: recommendedKinds(root),
        all: allKinds(root),
        none: [],
    };

    const preset =
        (Object.keys(presets) as Preset[]).find((key) =>
            sameSet(categories, presets[key])
        ) ?? null;

    return (
        <div className="space-y-4">
            {preview && (
                <p
                    role="status"
                    className="ds-inset p-3 text-sm text-hud-accent-fg"
                >
                    {t('wizard.resetNotice')}
                </p>
            )}
            <HudSegmented
                id="compendium-presets"
                label={t('categoriesStep.title')}
                value={preset}
                disabled={busy}
                onValueChange={(key) => selectCategories(presets[key])}
                options={[
                    {
                        value: 'recommended',
                        label: t('categoriesStep.recommended'),
                    },
                    { value: 'all', label: t('categoriesStep.all') },
                    { value: 'none', label: t('categoriesStep.none') },
                ]}
            />
            <fieldset
                disabled={busy}
                className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3"
            >
                {groups.map((group) => (
                    <div
                        key={group.id}
                        data-group={group.id}
                        className="ds-panel space-y-2 p-3"
                    >
                        <p className="text-xs tracking-wide text-hud-muted uppercase">
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
            {blocks.length > 0 && (
                <HudSection panel title={t('categoriesStep.chapters')}>
                    <CompendiumMaterials
                        blocks={blocks}
                        excluded={excludedChapters}
                        busy={busy}
                        onChange={setChapterExclusions}
                    />
                </HudSection>
            )}
            <HudSection
                panel
                title={t('advanced.title')}
                action={
                    advancedActive(options) && (
                        <span className="text-sm text-hud-good">
                            {t('advanced.active')}
                        </span>
                    )
                }
            >
                <CompendiumAdvanced root={root} wizard={wizard} />
            </HudSection>
        </div>
    );
}
