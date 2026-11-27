'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { ADMIN_USER_FILTERS, ADMIN_USER_SORTS } from '@/lib/schemas/admin';
import type { AdminUsersQuery } from '@/types/admin';

export function UserFilters({
    q,
    sort,
    filter,
    onQ,
    onSort,
    onFilter,
}: {
    q: string;
    sort: AdminUsersQuery['sort'];
    filter: AdminUsersQuery['filter'];
    onQ: (v: string) => void;
    onSort: (v: AdminUsersQuery['sort']) => void;
    onFilter: (v: AdminUsersQuery['filter']) => void;
}) {
    const t = useTranslations('admin.users');

    return (
        <div className="grid gap-2 sm:grid-cols-[1fr_12rem_12rem]">
            <Input
                type="search"
                value={q}
                maxLength={100}
                placeholder={t('search')}
                aria-label={t('search')}
                onChange={(e) => onQ(e.target.value)}
            />
            <SelectField
                aria-label={t('sort.label')}
                value={sort}
                onValueChange={(v) => onSort(v as AdminUsersQuery['sort'])}
                options={ADMIN_USER_SORTS.map((s) => ({
                    value: s,
                    label: t(`sort.${s}`),
                }))}
            />
            <SelectField
                aria-label={t('filter.label')}
                value={filter}
                onValueChange={(v) => onFilter(v as AdminUsersQuery['filter'])}
                options={ADMIN_USER_FILTERS.map((f) => ({
                    value: f,
                    label: t(`filter.${f}`),
                }))}
            />
        </div>
    );
}
