'use client';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type {
    CompendiumImportController,
    CompendiumWizardView,
} from '@/lib/hooks/compendium-import';
import { estimateRecords } from '@/lib/utils/compendium-import/categories';

export function CompendiumSummary({
    wizard,
    view,
    expired = false,
}: {
    wizard: CompendiumImportController;
    view: CompendiumWizardView;
    expired?: boolean;
}) {
    const t = useTranslations('compendium');

    const {
        root,
        categories,
        excludedChapters,
        preview,
        result,
        rights,
        busy,
    } = wizard.state;

    const { runPreview, confirm, close } = wizard.actions;

    const report = result ?? preview?.report ?? null;

    const records = root
        ? estimateRecords(root, categories, excludedChapters)
        : report
          ? report.counts.created + report.counts.updated
          : 0;

    const main = {
        1: view.maxStep > 1 && {
            label: t('summary.next'),
            disabled: busy,
            run: () => view.setStep(2),
        },
        2: {
            label: t('categoriesStep.preview'),
            disabled: busy || !root || !categories.length,
            run: () => void runPreview(),
        },
        3: {
            label: t('summary.next'),
            disabled: busy || !preview,
            run: () => view.setStep(4),
        },
        4: {
            label: t('import.confirm'),
            disabled:
                busy || expired || !rights || !preview?.report.readyToImport,
            run: () => void confirm(),
        },
        5: { label: t('wizard.restart'), disabled: false, run: close },
    }[view.step];

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 @3xl:block @3xl:space-y-3">
            <div className="min-w-0 space-y-1">
                <h2 className="hud-sc hidden text-base text-hud-ink @3xl:block">
                    {t('summary.title')}
                </h2>
                {root && (
                    <p
                        className="text-sm text-hud-muted"
                        data-testid="import-summary"
                    >
                        {t('categoriesStep.summary', {
                            categories: categories.length,
                            records,
                        })}
                    </p>
                )}
                {!root && report && (
                    <p className="text-sm text-hud-muted">
                        {t('summary.records', { count: records })}
                    </p>
                )}
                {report?.media && (
                    <p className="hidden text-sm text-hud-muted @3xl:block">
                        {t('summary.images', { count: report.media.queued })}
                    </p>
                )}
                {report && report.counts.errors > 0 && (
                    <p className="hidden text-sm text-hud-bad @3xl:block">
                        {t('report.blockersTitle', {
                            count: report.counts.errors,
                        })}
                    </p>
                )}
            </div>
            {main && (
                <Button
                    className="@3xl:w-full"
                    disabled={main.disabled}
                    onClick={main.run}
                >
                    {main.label}
                </Button>
            )}
        </div>
    );
}
