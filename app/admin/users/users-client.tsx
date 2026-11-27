'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { UserFilters } from '@/components/admin/UserFilters';
import { UsersTable } from '@/components/admin/UsersTable';
import { QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud/HudButton';
import { HudPanel } from '@/components/hud/page';
import { useAdminUsers } from '@/lib/hooks/admin';
import { useDebouncedValue } from '@/lib/hooks/common';
import type { AdminUsersQuery } from '@/types/admin';

const SEARCH_MS = 300;

export function UsersClient() {
    const t = useTranslations('admin');

    const [q, setQ] = useState('');

    const [sort, setSort] = useState<AdminUsersQuery['sort']>('created');

    const [filter, setFilter] = useState<AdminUsersQuery['filter']>('all');

    const debouncedQ = useDebouncedValue(q.trim(), SEARCH_MS);

    const query = useAdminUsers({
        q: debouncedQ || undefined,
        sort,
        filter,
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <UserFilters
                        q={q}
                        sort={sort}
                        filter={filter}
                        onQ={setQ}
                        onSort={setSort}
                        onFilter={setFilter}
                    />
                </div>
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                >
                    {t('common.refresh')}
                </HudButton>
            </div>
            <QueryState query={query}>
                {(data) => {
                    const rows = data.pages.flatMap((p) => p.rows);

                    const authMetaAvailable = data.pages.every(
                        (p) => p.authMetaAvailable
                    );

                    return (
                        <HudPanel className="space-y-3">
                            {rows.length ? (
                                <UsersTable
                                    rows={rows}
                                    authMetaAvailable={authMetaAvailable}
                                />
                            ) : (
                                <p className="text-sm text-hud-muted">
                                    {t('users.empty')}
                                </p>
                            )}
                            {query.hasNextPage && (
                                <HudButton
                                    className="px-3 py-1.5 text-sm"
                                    disabled={query.isFetchingNextPage}
                                    onClick={() => void query.fetchNextPage()}
                                >
                                    {t('users.showMore')}
                                </HudButton>
                            )}
                        </HudPanel>
                    );
                }}
            </QueryState>
        </div>
    );
}
