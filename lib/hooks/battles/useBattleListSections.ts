'use client';

import { useState } from 'react';

import { BattleStatus } from '@/lib/constants/battle';
import { useSearch } from '@/lib/hooks/common';

export type BattleListFilter = 'all' | 'prepared' | 'completed';

const battleFields = (battle: { name: string }) => [battle.name];

export function useBattleListSections<
    B extends { name: string; status: string },
>(battles: B[]) {
    const [filter, setFilter] = useState<BattleListFilter>('all');

    const search = useSearch(battles, battleFields);

    const byStatus = (status: BattleStatus, items: B[]) =>
        items.filter((b) => b.status === status);

    const prepared = byStatus(BattleStatus.PREPARED, search.items);

    const completed = byStatus(BattleStatus.COMPLETED, search.items);

    return {
        search,
        filter: {
            value: filter,
            set: setFilter,
            counts: {
                all: prepared.length + completed.length,
                prepared: prepared.length,
                completed: completed.length,
            },
        },
        active: byStatus(BattleStatus.ACTIVE, battles),
        prepared: filter === 'completed' ? [] : prepared,
        completed: filter === 'prepared' ? [] : completed,
    };
}
