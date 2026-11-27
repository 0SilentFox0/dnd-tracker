'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { AdminUserRow } from '@/types/admin';

export const formatDay = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

const COLUMNS = [
    'created',
    'lastActive',
    'lastSignIn',
    'campaigns',
    'memberships',
    'country',
    'status',
    'subscription',
] as const;

export function UsersTable({
    rows,
    authMetaAvailable,
}: {
    rows: AdminUserRow[];
    authMetaAvailable: boolean;
}) {
    const t = useTranslations('admin.users');

    const na = useTranslations('admin.common')('na');

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-hud-muted">
                        <th className="sticky left-0 bg-[var(--palette-panel)] py-1 pr-3 font-normal">
                            {t('columns.user')}
                        </th>
                        {COLUMNS.map((c) => (
                            <th
                                key={c}
                                className="px-2 py-1 font-normal whitespace-nowrap"
                            >
                                {t(`columns.${c}`)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} className="border-t border-hud-line">
                            <td className="sticky left-0 max-w-56 bg-[var(--palette-panel)] py-1 pr-3">
                                <Link
                                    href={`/admin/users/${r.id}`}
                                    className="block truncate text-hud-ink underline-offset-2 hover:underline"
                                >
                                    {r.displayName}
                                </Link>
                                <span className="block truncate text-xs text-hud-muted">
                                    {r.email}
                                </span>
                            </td>
                            <td className="px-2 whitespace-nowrap">
                                {formatDay(r.createdAt)}
                            </td>
                            <td className="px-2 whitespace-nowrap">
                                {formatDay(r.lastActiveAt)}
                            </td>
                            <td className="px-2 whitespace-nowrap">
                                {authMetaAvailable
                                    ? formatDay(r.lastSignInAt)
                                    : na}
                            </td>
                            <td className="px-2">{r.campaignsDm}</td>
                            <td className="px-2">{r.memberships}</td>
                            <td className="px-2">{r.country ?? '—'}</td>
                            <td className="px-2">
                                <span className="flex gap-1">
                                    {authMetaAvailable ? (
                                        r.bannedUntil && (
                                            <Badge variant="destructive">
                                                {t('banned')}
                                            </Badge>
                                        )
                                    ) : (
                                        <span>{na}</span>
                                    )}
                                    {r.sharedIp && (
                                        <Badge variant="outline">
                                            {t('sharedIp')}
                                        </Badge>
                                    )}
                                </span>
                            </td>
                            <td className="px-2">{t('noSubscription')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
