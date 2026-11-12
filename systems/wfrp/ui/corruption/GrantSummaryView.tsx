'use client';

import { useTranslations } from 'next-intl';

import { MutationEffects } from './MutationEffects';

import { useText } from '@/lib/i18n/use-text';
import type { GrantSummary } from '@/systems/wfrp/rules/corruption/types';

export function GrantSummaryView({ summary }: { summary: GrantSummary }) {
    const t = useTranslations('wfrpCorruption');

    const text = useText();

    const { test, mutation } = summary;

    return (
        <ul className="space-y-2 text-sm text-hud-bone">
            <li>
                {t('points', {
                    points: summary.total,
                    threshold: summary.threshold,
                })}
            </li>
            {!test && <li>{t('summary.noTest')}</li>}
            {summary.pointsCapped && <li>{t('summary.pointsCapped')}</li>}
            {test && (
                <li>
                    {t('summary.test', {
                        roll: test.roll,
                        target: test.target,
                        sl: test.sl,
                    })}{' '}
                    ·{' '}
                    {test.outcome === 'success' || test.outcome === 'critical'
                        ? t('summary.passed')
                        : t('summary.failed')}
                </li>
            )}
            {mutation && (
                <li className="space-y-1">
                    <p className="font-medium text-hud-ink">
                        {t('summary.mutation')} · {t(`kinds.${mutation.kind}`)}
                    </p>
                    <p className="text-xs text-hud-muted">
                        {t('summary.typeRoll', { roll: mutation.typeRoll })}
                    </p>
                    <p>{text(mutation.text)}</p>
                    <MutationEffects effects={mutation.effects} />
                </li>
            )}
            {summary.capped && <li>{t('summary.capped')}</li>}
        </ul>
    );
}
