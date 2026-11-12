// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS, useSearch } from '@/lib/hooks/common';

const items = [
    { name: 'Куля', group: 'Вогонь' },
    { name: 'Крига', group: 'Лід' },
];

const fieldsOf = (i: (typeof items)[number]) => [i.name, i.group];

describe('useSearch', () => {
    beforeEach(() => vi.useFakeTimers());

    afterEach(() => vi.useRealTimers());

    it('без запиту повертає все й неактивний', () => {
        const { result } = renderHook(() => useSearch(items, fieldsOf));

        expect(result.current.items).toEqual(items);
        expect(result.current.isActive).toBe(false);
    });

    it('фільтрує за будь-яким полем', () => {
        const { result } = renderHook(() => useSearch(items, fieldsOf));

        act(() => result.current.query.set('лід'));

        expect(result.current.query.value).toBe('лід');
        expect(result.current.items).toEqual(items);

        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

        expect(result.current.items).toEqual([items[1]]);
        expect(result.current.isActive).toBe(true);
    });
});
