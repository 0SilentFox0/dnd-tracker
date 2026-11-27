'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AdminSecurity } from '@/types/admin';

export function SharedIpGroups({
    groups,
}: {
    groups: AdminSecurity['groups'];
}) {
    const t = useTranslations('admin.security');

    if (!groups.length)
        return <p className="text-sm text-hud-muted">{t('sharedIpsEmpty')}</p>;

    return (
        <ul className="space-y-3">
            {groups.map((g) => (
                <li key={g.ip} className="border-t border-hud-line pt-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono">{g.ip}</span>
                        <span className="text-hud-muted">
                            {g.country ?? '—'}
                        </span>
                        <span className="text-hud-muted">
                            {t('sharedDays', { n: g.sharedDays })}
                        </span>
                        {g.crowd && (
                            <span className="rounded border border-hud-line px-1.5 text-xs">
                                {t('crowd')}
                            </span>
                        )}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-sm">
                        {g.accounts.map((a) => (
                            <li key={a.userId}>
                                <Link
                                    href={`/admin/users/${a.userId}`}
                                    className="underline"
                                >
                                    {a.displayName} ({a.email})
                                </Link>{' '}
                                <span className="text-hud-muted">
                                    {a.device ?? '—'} ·{' '}
                                    {t('activeDays', { n: a.days })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}
