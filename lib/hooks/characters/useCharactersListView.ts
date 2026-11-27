'use client';

import { createStorageValue, useStorageValue } from '@/lib/hooks/common';

export type CharactersListView = 'grid' | 'list';

const store = createStorageValue<CharactersListView>(
    'characters-list-view',
    'grid',
    {
        parse: (raw) => (raw === 'list' ? 'list' : 'grid'),
        serialize: (v) => v,
    }
);

export function useCharactersListView(): [
    CharactersListView,
    (view: CharactersListView) => void,
] {
    return [useStorageValue(store, 'grid'), store.set];
}
