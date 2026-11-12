'use client';

import { useMemo, useState } from 'react';

import { useDebouncedValue } from './useDebouncedValue';

import { matchesQuery } from '@/lib/utils/common/text-search';

export const SEARCH_DEBOUNCE_MS = 250;

export interface SearchState<T> {
    query: { value: string; set: (value: string) => void };
    items: T[];
    isActive: boolean;
}

export function useSearch<T>(
    items: T[],
    fieldsOf: (item: T) => (string | null | undefined)[],
    debounceMs = SEARCH_DEBOUNCE_MS
): SearchState<T> {
    const [value, set] = useState('');

    const debounced = useDebouncedValue(value, debounceMs);

    const deferred = debounceMs > 0 ? debounced : value;

    const isActive = deferred.trim() !== '';

    const filtered = useMemo(
        () =>
            isActive
                ? items.filter((item) => matchesQuery(fieldsOf(item), deferred))
                : items,
        [items, deferred, isActive, fieldsOf]
    );

    return { query: { value, set }, items: filtered, isActive };
}
