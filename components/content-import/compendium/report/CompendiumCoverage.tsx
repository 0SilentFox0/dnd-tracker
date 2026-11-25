'use client';
import { Disclosure } from '@/components/ui/disclosure';
import { useTranslator } from '@/lib/i18n/use-translator';
import { categoryLabel } from '@/lib/utils/compendium-import/flow';
import type { splitCategories } from '@/lib/utils/compendium-import/labels';

const CATEGORY_ROW =
    'grid grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)] items-center gap-x-1 py-1';

export function CompendiumCoverage({
    categories,
}: {
    categories: ReturnType<typeof splitCategories>;
}) {
    const t = useTranslator('compendium');

    return (
        <>
            {categories.main.length > 0 && (
                <div className="space-y-1">
                    <h3 className="hud-sc text-base text-hud-ink">
                        {t('report.coverage')}
                    </h3>
                    <div role="table" className="text-xs">
                        <div
                            role="row"
                            className={`${CATEGORY_ROW} text-hud-muted`}
                        >
                            <span role="columnheader">
                                {t('report.colCategory')}
                            </span>
                            <span role="columnheader" className="text-right">
                                {t('report.colPresent')}
                            </span>
                            <span role="columnheader" className="text-right">
                                {t('report.colMappedShort')}
                            </span>
                            <span role="columnheader" className="text-right">
                                {t('report.colPartialShort')}
                            </span>
                            <span role="columnheader" className="text-right">
                                {t('report.colSkippedShort')}
                            </span>
                        </div>
                        {categories.main.map(([kind, count]) => (
                            <div
                                role="row"
                                key={kind}
                                className={`${CATEGORY_ROW} border-t border-hud-rule ${count.partial > 0 ? 'bg-hud-panel-2' : ''}`}
                            >
                                <span
                                    role="cell"
                                    className="min-w-0 break-words"
                                >
                                    {categoryLabel(t, kind)}
                                </span>
                                {[
                                    count.present,
                                    count.mapped,
                                    count.partial,
                                    count.skipped,
                                ].map((value, i) => (
                                    <span
                                        role="cell"
                                        className={`text-right ${value === 0 ? 'text-hud-muted' : ''}`}
                                        key={i}
                                    >
                                        {value === 0 ? '—' : value}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {categories.technical.length > 0 && (
                <Disclosure
                    className="text-xs text-hud-muted"
                    summary={
                        <span>
                            {t('report.technical', {
                                count: categories.technical.length,
                            })}
                        </span>
                    }
                >
                    <ul className="mt-1">
                        {categories.technical.map(([kind, count]) => (
                            <li key={kind}>
                                {t.has(`categories.${kind}`)
                                    ? `${categoryLabel(t, kind)} (${kind})`
                                    : kind}
                                : {count.present}
                            </li>
                        ))}
                    </ul>
                </Disclosure>
            )}
        </>
    );
}
