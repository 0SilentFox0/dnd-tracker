'use client';

import { useTranslations } from 'next-intl';

import { useProfile } from '../ProfileContext';

import { HudSection } from '@/components/hud/form';

export function ChargesList() {
    const t = useTranslations('rest.charges');

    const { sheet } = useProfile();

    const charges = sheet.rest?.persist ? sheet.rest.charges : [];

    if (charges.length === 0) return null;

    return (
        <HudSection panel title={t('title')}>
            <ul className="text-sm">
                {charges.map((c) => (
                    <li
                        key={c.key}
                        className="flex min-h-11 items-center justify-between gap-2 border-b border-hud-rule last:border-b-0"
                    >
                        <span className="min-w-0 truncate">{c.name}</span>
                        <span className="shrink-0 text-hud-muted tabular-nums">
                            {t('left', {
                                left: Math.max(0, c.uses - c.used),
                                uses: c.uses,
                            })}{' '}
                            · {c.rest ? t(c.rest) : t('never')}
                        </span>
                    </li>
                ))}
            </ul>
        </HudSection>
    );
}
