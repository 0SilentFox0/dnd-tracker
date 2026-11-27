'use client';

import { useTranslations } from 'next-intl';

import { formatDay } from '@/components/admin/UsersTable';
import { Badge } from '@/components/ui/badge';
import type { AdminUserDetail } from '@/types/admin';

export function UserHeader({ user }: { user: AdminUserDetail['user'] }) {
    const t = useTranslations('admin.user');

    const na = useTranslations('admin.common')('na');

    const facts: [string, string][] = [
        [t('registered'), formatDay(user.createdAt)],
        [t('lastActive'), formatDay(user.lastActiveAt)],
        [
            t('lastSignIn'),
            user.lastSignInAt ? formatDay(user.lastSignInAt) : na,
        ],
        [t('locale'), user.locale ?? '—'],
        [t('timeZone'), user.timeZone ?? '—'],
    ];

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-hud-ink">
                    {user.displayName}
                </h2>
                {user.bannedUntil && (
                    <Badge variant="destructive">
                        {t('bannedUntil', {
                            date: formatDay(user.bannedUntil),
                        })}
                    </Badge>
                )}
            </div>
            <p className="text-base text-hud-muted">{user.email}</p>
            <dl className="grid grid-cols-2 gap-2 text-base sm:grid-cols-5">
                {facts.map(([k, v]) => (
                    <div key={k}>
                        <dt className="text-sm text-hud-muted uppercase">
                            {k}
                        </dt>
                        <dd>{v}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
