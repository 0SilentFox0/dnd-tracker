'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AdminSecurity } from '@/types/admin';

export function AdminActionFeed({
    actions,
}: {
    actions: AdminSecurity['actions'];
}) {
    const t = useTranslations('admin.security');

    if (!actions.length)
        return <p className="text-sm text-hud-muted">{t('actionsEmpty')}</p>;

    return (
        <ul className="space-y-1 text-sm">
            {actions.map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex flex-wrap gap-2">
                    <span className="whitespace-nowrap text-hud-muted">
                        {a.at.slice(0, 16).replace('T', ' ')}
                    </span>
                    <span>{a.action}</span>
                    <Link
                        href={`/admin/users/${a.targetUserId}`}
                        className="font-mono underline"
                    >
                        {a.targetUserId}
                    </Link>
                    <span className="font-mono break-all text-hud-muted">
                        {JSON.stringify(a.meta)}
                    </span>
                </li>
            ))}
        </ul>
    );
}
