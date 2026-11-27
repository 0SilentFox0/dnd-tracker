'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatDay } from '@/components/admin/UsersTable';
import type { AdminUserDetail } from '@/types/admin';

export function UserAccessTable({
    access,
}: {
    access: AdminUserDetail['access'];
}) {
    const t = useTranslations('admin.user');

    if (!access.length)
        return <p className="text-base text-hud-muted">{t('accessEmpty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-base">
                <thead>
                    <tr className="text-left text-hud-muted">
                        {(
                            [
                                'ip',
                                'country',
                                'device',
                                'firstSeen',
                                'lastSeen',
                                'days',
                                'otherAccounts',
                            ] as const
                        ).map((c) => (
                            <th
                                key={c}
                                className="px-3 py-2.5 text-sm font-medium whitespace-nowrap text-hud-muted"
                            >
                                {t(c)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {access.map((a) => (
                        <tr
                            key={a.ip}
                            className="border-t border-hud-line align-top"
                        >
                            <td className="px-3 py-2.5 font-mono">{a.ip}</td>
                            <td className="px-3 py-2.5">{a.country ?? '—'}</td>
                            <td className="px-3 py-2.5">{a.device ?? '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                {formatDay(a.firstSeen)}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                {formatDay(a.lastSeen)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                                {a.days}
                            </td>
                            <td className="px-3 py-2.5">
                                {a.otherAccounts.length
                                    ? a.otherAccounts.map((o) => (
                                          <Link
                                              key={o.id}
                                              href={`/admin/users/${o.id}`}
                                              className="block text-hud-ink underline-offset-2 hover:underline"
                                          >
                                              {o.displayName}
                                          </Link>
                                      ))
                                    : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
