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
        return <p className="text-sm text-hud-muted">{t('accessEmpty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                                className="px-2 py-1 font-normal whitespace-nowrap"
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
                            <td className="px-2 py-1 font-mono">{a.ip}</td>
                            <td className="px-2 py-1">{a.country ?? '—'}</td>
                            <td className="px-2 py-1">{a.device ?? '—'}</td>
                            <td className="px-2 py-1 whitespace-nowrap">
                                {formatDay(a.firstSeen)}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
                                {formatDay(a.lastSeen)}
                            </td>
                            <td className="px-2 py-1">{a.days}</td>
                            <td className="px-2 py-1">
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
