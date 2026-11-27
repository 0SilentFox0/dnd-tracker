'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Network } from 'lucide-react';

import { HudPill } from '@/components/hud/page';
import type { AdminSecurity } from '@/types/admin';

export function SharedIpGroups({
    groups,
}: {
    groups: AdminSecurity['groups'];
}) {
    const t = useTranslations('admin.security');

    if (!groups.length)
        return (
            <p className="text-base text-hud-muted">{t('sharedIpsEmpty')}</p>
        );

    return (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {groups.map((g) => (
                <li
                    key={g.ip}
                    className="space-y-2 rounded-lg border border-hud-line p-3"
                >
                    <div className="flex flex-wrap items-center gap-2 text-base">
                        <Network
                            aria-hidden
                            className="size-4 shrink-0 text-hud-accent-fg"
                        />
                        <span className="font-mono font-semibold text-hud-ink">
                            {g.ip}
                        </span>
                        <HudPill tone="muted">{g.country ?? '—'}</HudPill>
                        {g.crowd && (
                            <HudPill tone="accent">{t('crowd')}</HudPill>
                        )}
                        <span className="ml-auto text-sm text-hud-muted">
                            {t('sharedDays', { n: g.sharedDays })}
                        </span>
                    </div>
                    <ul className="divide-y divide-hud-rule text-base">
                        {g.accounts.map((a) => (
                            <li
                                key={a.userId}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5"
                            >
                                <Link
                                    href={`/admin/users/${a.userId}`}
                                    className="min-w-0 break-all underline"
                                >
                                    {a.displayName} ({a.email})
                                </Link>
                                <span className="text-sm whitespace-nowrap text-hud-muted">
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
