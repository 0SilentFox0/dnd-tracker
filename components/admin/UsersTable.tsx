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
            <table className="w-full text-base">
                <thead>
                    <tr className="text-left text-hud-muted">
                        <th className="sticky left-0 bg-[var(--palette-panel)] px-3 py-2.5 text-base font-medium text-hud-muted">
                            {t('columns.user')}
                        </th>
                        {COLUMNS.map((c) => (
                            <th
                                key={c}
                                className="px-3 py-2.5 text-base font-medium whitespace-nowrap text-hud-muted"
                            >
                                {t(`columns.${c}`)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} className="border-t border-hud-line">
                            <td className="sticky left-0 max-w-56 bg-[var(--palette-panel)] px-3 py-2.5">
                                <Link
                                    href={`/admin/users/${r.id}`}
                                    className="block truncate text-hud-ink underline-offset-2 hover:underline"
                                >
                                    {r.displayName}
                                </Link>
                                <span className="block truncate text-sm text-hud-muted">
                                    {r.email}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                {formatDay(r.createdAt)}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                {formatDay(r.lastActiveAt)}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                {authMetaAvailable
                                    ? formatDay(r.lastSignInAt)
                                    : na}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                                {r.campaignsDm}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                                {r.memberships}
                            </td>
                            <td className="px-3 py-2.5">{r.country ?? '—'}</td>
                            <td className="px-3 py-2.5">
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
                            <td className="px-3 py-2.5">
                                {t('noSubscription')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
