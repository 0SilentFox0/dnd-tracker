// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useClassesList } from '../useClassesList';

vi.mock('../useClasses', () => ({
    useClasses: () => ({
        data: [
            { id: 'w', name: 'Чарівник' },
            { id: 'b', name: 'Варвар' },
            { id: 'a', name: 'Бард' },
            { id: 'f', name: 'Воїн' },
        ],
        isLoading: false,
    }),
    useCreateClass: () => ({ mutate: vi.fn() }),
    useDeleteClass: () => ({ mutate: vi.fn() }),
}));
vi.mock('next-intl', async (orig) => ({
    ...(await orig<object>()),
    useLocale: () => 'uk',
}));
vi.mock('@/lib/hooks/common', () => ({
    useLibraryList: ({ query }: { query: { data: unknown[] } }) => ({
        items: query.data,
        isLoading: false,
        createDialog: { open: false, setOpen: vi.fn() },
        create: vi.fn(),
        remove: vi.fn(),
    }),
}));

describe('useClassesList', () => {
    it('sorts classes alphabetically by displayed name in the locale', () => {
        const { result } = renderHook(() => useClassesList('c1'));

        expect(result.current.classes.map((c) => c.name)).toEqual([
            'Бард',
            'Варвар',
            'Воїн',
            'Чарівник',
        ]);
    });
});
