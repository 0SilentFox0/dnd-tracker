'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { AdminUserDetail } from '@/types/admin';

const link = 'text-hud-ink underline-offset-2 hover:underline';

export function UserCampaigns({
    owned,
    joined,
    templates,
}: Pick<AdminUserDetail, 'owned' | 'joined' | 'templates'>) {
    const t = useTranslations('admin.user');

    return (
        <div className="space-y-4 text-base">
            <div>
                <h3 className="hud-sc mb-1 text-sm">{t('owned')}</h3>
                {owned.length ? (
                    <ul className="space-y-1">
                        {owned.map((c) => (
                            <li
                                key={c.id}
                                className="flex flex-wrap items-center gap-2"
                            >
                                <Link
                                    href={`/admin/campaigns/${c.id}`}
                                    className={link}
                                >
                                    {c.name}
                                </Link>
                                <Badge variant="outline">{c.kind}</Badge>
                                {c.system && (
                                    <Badge variant="outline">{c.system}</Badge>
                                )}
                                <span className="text-hud-muted">
                                    {t('players', { n: c.players })}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-hud-muted">{t('noOwned')}</p>
                )}
            </div>
            <div>
                <h3 className="hud-sc mb-1 text-sm">{t('joined')}</h3>
                {joined.length ? (
                    <ul className="space-y-1">
                        {joined.map((c) => (
                            <li
                                key={c.id}
                                className="flex flex-wrap items-center gap-2"
                            >
                                <Link
                                    href={`/admin/campaigns/${c.id}`}
                                    className={link}
                                >
                                    {c.name}
                                </Link>
                                <span className="text-hud-muted">
                                    {t('dm', { name: c.dm.displayName })}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-hud-muted">{t('noJoined')}</p>
                )}
            </div>
            {templates.length > 0 && (
                <div>
                    <h3 className="hud-sc mb-1 text-sm">{t('templates')}</h3>
                    <ul className="space-y-1">
                        {templates.map((x) => (
                            <li
                                key={x.id}
                                className="flex flex-wrap items-center gap-2"
                            >
                                <Link
                                    href={`/admin/campaigns/${x.id}`}
                                    className={link}
                                >
                                    {x.name}
                                </Link>
                                <span className="text-hud-muted">
                                    {t('versions', { n: x.versions })},{' '}
                                    {t('clones', { n: x.clones })}
                                </span>
                                {x.blocksDeletion && (
                                    <Badge variant="destructive">
                                        {t('blocksDeletion')}
                                    </Badge>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
