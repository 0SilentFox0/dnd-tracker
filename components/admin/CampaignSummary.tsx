'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatDay } from '@/components/admin/UsersTable';
import { HudPanel, HudSectionTitle } from '@/components/hud/page';
import { Badge } from '@/components/ui/badge';
import type { AdminCampaignSummary } from '@/types/admin';

const COUNTS = [
    'characters',
    'battles',
    'maps',
    'scenarioPages',
    'units',
    'spells',
] as const;

const formatBytes = (n: number) =>
    n < 1024 * 1024
        ? `${Math.round(n / 1024)} KB`
        : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function CampaignSummary({ data }: { data: AdminCampaignSummary }) {
    const t = useTranslations('admin.campaign');

    const na = useTranslations('admin.common')('na');

    return (
        <div className="space-y-4">
            <HudPanel className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-hud-ink">
                        {data.name}
                    </h2>
                    <Badge variant="outline">{data.kind}</Badge>
                    <Badge variant="outline">{data.status}</Badge>
                    {data.system && (
                        <Badge variant="outline">{data.system}</Badge>
                    )}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-base sm:grid-cols-4">
                    <div>
                        <dt className="text-sm text-hud-muted uppercase">
                            {t('owner')}
                        </dt>
                        <dd>
                            <Link
                                href={`/admin/users/${data.owner.id}`}
                                className="text-hud-ink underline-offset-2 hover:underline"
                            >
                                {data.owner.displayName}
                            </Link>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm text-hud-muted uppercase">
                            {t('created')}
                        </dt>
                        <dd>{formatDay(data.createdAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-hud-muted uppercase">
                            {t('updated')}
                        </dt>
                        <dd>{formatDay(data.updatedAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-hud-muted uppercase">
                            {t('storage')}
                        </dt>
                        <dd>
                            {data.storageBytes === null
                                ? na
                                : formatBytes(data.storageBytes)}
                        </dd>
                    </div>
                </dl>
            </HudPanel>
            <HudPanel className="space-y-2">
                <HudSectionTitle>{t('counts')}</HudSectionTitle>
                <dl className="grid grid-cols-2 gap-2 text-base sm:grid-cols-6">
                    {COUNTS.map((k) => (
                        <div key={k}>
                            <dt className="text-sm text-hud-muted uppercase">
                                {t(k)}
                            </dt>
                            <dd className="text-lg">{data.counts[k]}</dd>
                        </div>
                    ))}
                </dl>
                {data.template && (
                    <p className="text-base text-hud-muted">
                        {t('template')}: {t('versions')}{' '}
                        {data.template.versions}, {t('clones')}{' '}
                        {data.template.clones}
                    </p>
                )}
            </HudPanel>
            <HudPanel className="space-y-2">
                <HudSectionTitle>{t('members')}</HudSectionTitle>
                <ul className="space-y-1 text-base">
                    {data.members.map((m) => (
                        <li key={m.id} className="flex gap-2">
                            <Link
                                href={`/admin/users/${m.id}`}
                                className="text-hud-ink underline-offset-2 hover:underline"
                            >
                                {m.displayName}
                            </Link>
                            <span className="text-hud-muted">{m.role}</span>
                        </li>
                    ))}
                </ul>
            </HudPanel>
        </div>
    );
}
