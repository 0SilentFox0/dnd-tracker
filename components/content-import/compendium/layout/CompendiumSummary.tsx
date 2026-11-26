'use client';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
    compendiumFacts,
    type CompendiumImportController,
    type PreviewExpiry,
    type WizardView,
} from '@/lib/hooks/compendium-import';
import { formatBytes } from '@/lib/utils/common/format';

type Primary = { label: string; disabled: boolean; run: () => void };

function primaryAction(
    t: ReturnType<typeof useTranslations>,
    wizard: CompendiumImportController,
    view: WizardView,
    expired: boolean
): Primary {
    const { root, preview, rights, busy, categories } = wizard.state;

    const next = (): Primary => ({
        label: t('summary.next'),
        disabled: busy || view.step >= view.maxStep,
        run: () => view.setStep(view.step + 1),
    });

    switch (view.step) {
        case 0:
            return { ...next(), disabled: busy || !root };
        case 1:
            return {
                label: t('categoriesStep.preview'),
                disabled: busy || !categories.length,
                run: () => void wizard.actions.runPreview(),
            };
        case 2:
            return { ...next(), disabled: busy || !preview };
        case 3:
            return expired
                ? {
                      label: t('confirm.recheck'),
                      disabled: busy,
                      run: () => void wizard.actions.runPreview(),
                  }
                : {
                      label: t('import.confirm'),
                      disabled:
                          busy || !rights || !preview?.report.readyToImport,
                      run: () => void wizard.actions.confirm(),
                  };
        default:
            return {
                label: t('summary.new'),
                disabled: false,
                run: wizard.actions.close,
            };
    }
}

export function CompendiumSummary({
    wizard,
    view,
    expiry,
}: {
    wizard: CompendiumImportController;
    view: WizardView;
    expiry: PreviewExpiry;
}) {
    const t = useTranslations('compendium');

    const locale = useLocale();

    const { file, preview } = wizard.state;

    const facts = compendiumFacts(wizard.state);

    const primary = primaryAction(t, wizard, view, expiry.expired);

    const checking = view.step === 2 || view.step === 3;

    const rows: [string, number][] = [
        [t('import.steps.categories'), facts.categories],
        [t('summary.records'), facts.records],
        ...(preview
            ? ([
                  [t('import.media.title'), facts.images],
                  [t('report.blocker'), facts.blockers],
              ] as [string, number][])
            : []),
    ];

    return (
        <aside
            aria-label={t('summary.title')}
            className="ds-panel space-y-3 p-3 @3xl:p-4"
        >
            <p
                data-testid="import-summary"
                className="text-sm text-hud-muted @3xl:hidden"
            >
                {t('categoriesStep.summary', {
                    categories: facts.categories,
                    records: facts.records,
                })}
            </p>
            <div className="hidden space-y-3 @3xl:block">
                <h2 className="hud-sc text-base text-hud-ink">
                    {t('summary.title')}
                </h2>
                {file && (
                    <p className="text-sm break-all text-hud-ink">
                        {file.name}
                        <span className="block text-xs text-hud-muted">
                            {formatBytes(file.size)}
                        </span>
                    </p>
                )}
                <dl className="space-y-1 text-sm">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                            <dt className="text-hud-muted">{label}</dt>
                            <dd className="text-hud-ink tabular-nums">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
            {checking && expiry.expiresAt && !(expiry.expired && view.step === 3) && (
                <p
                    role={expiry.expired ? 'alert' : undefined}
                    className={
                        expiry.expired
                            ? 'text-sm text-hud-danger'
                            : 'text-xs text-hud-muted'
                    }
                >
                    {expiry.expired
                        ? t('confirm.expired')
                        : t('confirm.until', {
                              time: new Date(expiry.expiresAt).toLocaleTimeString(
                                  locale,
                                  { hour: '2-digit', minute: '2-digit' }
                              ),
                          })}
                </p>
            )}
            <Button
                className="w-full"
                disabled={primary.disabled}
                onClick={primary.run}
            >
                {primary.label}
            </Button>
        </aside>
    );
}
