'use client';

import { useTranslations } from 'next-intl';

import { useMechanicText } from './mechanic-text';

import { Button } from '@/components/ui/button';

export function RulesSide({
    changed,
    reset,
}: {
    changed: readonly string[];
    reset: (key: string) => void;
}) {
    const t = useTranslations('rules');

    const text = useMechanicText();

    return (
        <div className="space-y-4">
            {changed.length > 0 && (
                <div className="ds-panel space-y-2 p-4">
                    <h2 className="hud-sc text-lg text-hud-ink">
                        {t('page.changedSections', { count: changed.length })}
                    </h2>
                    <ul className="space-y-1">
                        {changed.map((key) => (
                            <li
                                key={key}
                                className="flex items-center justify-between gap-2 text-sm text-hud-text"
                            >
                                <span>
                                    {key === 'system'
                                        ? t('system.label')
                                        : text(key, 'label')}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`${t('page.resetSection')}: ${key}`}
                                    onClick={() => reset(key)}
                                >
                                    {t('page.resetSection')}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <p className="text-xs text-hud-muted">{t('form.hint')}</p>
        </div>
    );
}
