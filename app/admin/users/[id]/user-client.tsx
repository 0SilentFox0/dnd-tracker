'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ActivityStrip } from '@/components/admin/ActivityStrip';
import { UserAccessTable } from '@/components/admin/UserAccessTable';
import { UserActions } from '@/components/admin/UserActions';
import { UserCampaigns } from '@/components/admin/UserCampaigns';
import { UserHeader } from '@/components/admin/UserHeader';
import { formatDay } from '@/components/admin/UsersTable';
import { QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud/HudButton';
import { HudPanel, HudSectionTitle } from '@/components/hud/page';
import { useAdminUser } from '@/lib/hooks/admin';

export function UserClient({ id, selfId }: { id: string; selfId: string }) {
    const t = useTranslations('admin');

    const query = useAdminUser(id);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link
                    href="/admin/users"
                    className="text-sm text-hud-muted hover:text-hud-ink"
                >
                    {t('user.back')}
                </Link>
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                >
                    {t('common.refresh')}
                </HudButton>
            </div>
            <QueryState query={query}>
                {(d) => (
                    <>
                        <HudPanel>
                            <UserHeader user={d.user} />
                        </HudPanel>
                        <HudPanel className="space-y-3">
                            <HudSectionTitle>
                                {t('actions.title')}
                            </HudSectionTitle>
                            <UserActions
                                user={d.user}
                                templates={d.templates}
                                selfId={selfId}
                            />
                        </HudPanel>
                        <HudPanel className="space-y-3">
                            <HudSectionTitle>
                                {t('user.activity')}
                            </HudSectionTitle>
                            <ActivityStrip days={d.activityDays} />
                        </HudPanel>
                        <HudPanel className="space-y-3">
                            <UserCampaigns
                                owned={d.owned}
                                joined={d.joined}
                                templates={d.templates}
                            />
                        </HudPanel>
                        <HudPanel className="space-y-3">
                            <HudSectionTitle>
                                {t('user.access')}
                            </HudSectionTitle>
                            <UserAccessTable access={d.access} />
                        </HudPanel>
                        <HudPanel className="space-y-3">
                            <HudSectionTitle>
                                {t('user.actionsLog')}
                            </HudSectionTitle>
                            {d.actions.length ? (
                                <ul className="space-y-1 text-sm">
                                    {d.actions.map((a, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-hud-muted">
                                                {formatDay(a.at)}
                                            </span>
                                            <span>{a.action}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-hud-muted">
                                    {t('user.noActions')}
                                </p>
                            )}
                        </HudPanel>
                    </>
                )}
            </QueryState>
        </div>
    );
}
