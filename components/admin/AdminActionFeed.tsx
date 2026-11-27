'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { formatRelative } from '@/components/admin/relative-time';
import { HudPill } from '@/components/hud/page';
import type { AdminSecurity } from '@/types/admin';

const TONES = {
    ban: 'accent',
    delete: 'accent',
    unban: 'fact',
    signout: 'muted',
} as const;

const isKnown = (a: string): a is keyof typeof TONES => a in TONES;

const metaText = (meta: unknown) =>
    meta && typeof meta === 'object' && Object.keys(meta).length
        ? JSON.stringify(meta)
        : null;

export function AdminActionFeed({
    actions,
}: {
    actions: AdminSecurity['actions'];
}) {
    const t = useTranslations('admin.security');

    const locale = useLocale();

    const [now] = useState(() => Date.now());

    if (!actions.length)
        return <p className="text-base text-hud-muted">{t('actionsEmpty')}</p>;

    return (
        <ul className="divide-y divide-hud-rule text-base">
            {actions.map((a, i) => {
                const meta = metaText(a.meta);

                return (
                    <li
                        key={`${a.at}-${i}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                    >
                        <HudPill
                            tone={isKnown(a.action) ? TONES[a.action] : 'fact'}
                        >
                            {isKnown(a.action)
                                ? t(`actionTypes.${a.action}`)
                                : a.action}
                        </HudPill>
                        <Link
                            href={`/admin/users/${a.targetUserId}`}
                            className="font-mono text-sm underline"
                        >
                            {a.targetUserId.slice(0, 8)}
                        </Link>
                        {meta && (
                            <span className="min-w-0 font-mono text-sm break-all text-hud-muted">
                                {meta}
                            </span>
                        )}
                        <time
                            dateTime={a.at}
                            title={a.at.slice(0, 16).replace('T', ' ')}
                            className="ml-auto text-sm whitespace-nowrap text-hud-muted"
                        >
                            {formatRelative(a.at, locale, now)}
                        </time>
                    </li>
                );
            })}
        </ul>
    );
}
