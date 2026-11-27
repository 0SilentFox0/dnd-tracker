'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AdminActionFeed } from '@/components/admin/AdminActionFeed';
import { SharedIpGroups } from '@/components/admin/SharedIpGroups';
import { formatDay } from '@/components/admin/UsersTable';
import { QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud/HudButton';
import { HudSegmented } from '@/components/hud/HudSegmented';
import { HudPanel } from '@/components/hud/page';
import { useAdminSecurity } from '@/lib/hooks/admin';

const DAYS = [7, 30, 90] as const;

export function SecurityClient() {
    const t = useTranslations('admin.security');

    const [days, setDays] = useState<(typeof DAYS)[number]>(30);

    const query = useAdminSecurity(days);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <HudSegmented
                    id="admin-security-days"
                    label={t('period')}
                    value={String(days)}
                    onValueChange={(v) => setDays(Number(v) as typeof days)}
                    options={DAYS.map((d) => ({
                        value: String(d),
                        label: t('daysOption', { n: d }),
                    }))}
                />
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                >
                    {t('refresh')}
                </HudButton>
            </div>
            <QueryState query={query}>
                {(data) => (
                    <>
                        <HudPanel className="space-y-2">
                            <h2 className="hud-sc text-sm">{t('sharedIps')}</h2>
                            <SharedIpGroups groups={data.groups} />
                        </HudPanel>
                        <HudPanel className="space-y-2">
                            <h2 className="hud-sc text-sm">
                                {t('reRegistrations')}
                            </h2>
                            {data.reRegistrations.length ? (
                                <ul className="space-y-1 text-sm">
                                    {data.reRegistrations.map((r) => (
                                        <li key={r.userId}>
                                            <Link
                                                href={`/admin/users/${r.userId}`}
                                                className="underline"
                                            >
                                                {r.displayName} ({r.email})
                                            </Link>{' '}
                                            <span className="text-hud-muted">
                                                {t('reRegisteredAt', {
                                                    created: formatDay(
                                                        r.createdAt
                                                    ),
                                                    deleted: formatDay(
                                                        r.deletedAt
                                                    ),
                                                })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-hud-muted">
                                    {t('reRegistrationsEmpty')}
                                </p>
                            )}
                        </HudPanel>
                        <HudPanel className="space-y-2">
                            <h2 className="hud-sc text-sm">{t('actions')}</h2>
                            <AdminActionFeed actions={data.actions} />
                        </HudPanel>
                    </>
                )}
            </QueryState>
        </div>
    );
}
