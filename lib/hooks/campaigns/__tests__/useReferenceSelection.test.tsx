// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReferenceSelection } from '@/lib/hooks/campaigns';

const nav = vi.hoisted(() => ({
    query: '',
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    desktop: true,
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: nav.push,
        replace: nav.replace,
        back: nav.back,
    }),
    usePathname: () => '/campaigns/c1/info',
    useSearchParams: () => new URLSearchParams(nav.query),
}));
vi.mock('@/lib/hooks/common', () => ({
    DESKTOP_QUERY: '(min-width: 1024px)',
    useMediaQuery: () => nav.desktop,
}));

const VISIBLE = [
    { kind: 'spell', id: 'a' },
    { kind: 'spell', id: 'abc' },
] as const;

describe('useReferenceSelection', () => {
    beforeEach(() => {
        nav.query = '';
        nav.desktop = true;
        vi.clearAllMocks();
    });

    it('reads the selection from the URL on start', () => {
        nav.query = 'e=spell:abc';

        const { result } = renderHook(() =>
            useReferenceSelection(VISIBLE, { autoSelect: true })
        );

        expect(result.current.selected).toEqual({ kind: 'spell', id: 'abc' });
        expect(result.current.isOpen).toBe(true);
    });

    it('auto-picks the first entry without touching the URL', () => {
        const { result } = renderHook(() =>
            useReferenceSelection(VISIBLE, { autoSelect: true })
        );

        expect(result.current.selected).toEqual({ kind: 'spell', id: 'a' });
        expect(result.current.isOpen).toBe(false);
        expect(nav.replace).not.toHaveBeenCalled();
        expect(nav.push).not.toHaveBeenCalled();
    });

    it('replaces the URL on desktop and pushes on phone', () => {
        const desktop = renderHook(() =>
            useReferenceSelection(VISIBLE, { autoSelect: true })
        );

        desktop.result.current.select({ kind: 'spell', id: 'abc' });
        expect(nav.replace).toHaveBeenCalledWith(
            '/campaigns/c1/info?e=spell%3Aabc',
            { scroll: false }
        );

        nav.desktop = false;

        const phone = renderHook(() =>
            useReferenceSelection(VISIBLE, { autoSelect: false })
        );

        phone.result.current.select({ kind: 'spell', id: 'a' });
        expect(nav.push).toHaveBeenCalledTimes(1);

        phone.result.current.clear();
        expect(nav.back).toHaveBeenCalledTimes(1);
    });

    it('ignores a reference that is not visible', () => {
        nav.query = 'e=spell:gone';

        const { result } = renderHook(() =>
            useReferenceSelection(VISIBLE, { autoSelect: false })
        );

        expect(result.current.selected).toBeNull();
        expect(result.current.isOpen).toBe(false);
    });
});
