// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RefKey, useReferenceSelection } from '@/lib/hooks/campaigns';

const replace = vi.fn();

const push = vi.fn();

const back = vi.fn();

let query = '';

let mobile = false;

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace, push, back }),
    usePathname: () => '/campaigns/c1/info',
    useSearchParams: () => new URLSearchParams(query),
}));
vi.mock('@/lib/hooks/common', () => ({ useIsMobile: () => mobile }));

const visible: RefKey[] = ['spell:1', 'spell:2'];

const setup = (over: { autoSelect?: boolean; visible?: RefKey[] } = {}) => {
    const set = vi.fn();

    const hook = renderHook(() =>
        useReferenceSelection({
            visible: over.visible ?? visible,
            section: { value: 'all', set },
            autoSelect: over.autoSelect ?? false,
        })
    );

    return { ...hook, set };
};

describe('useReferenceSelection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        query = '';
        mobile = false;
    });

    it('replaces the URL on desktop', () => {
        const { result } = setup();

        result.current.select('spell:1');

        expect(push).not.toHaveBeenCalled();
        expect(replace.mock.calls[0][0]).toContain('e=spell%3A1');
    });

    it('pushes the URL on mobile and goes back on clear', () => {
        mobile = true;

        const { result } = setup();

        result.current.select('spell:1');
        expect(push.mock.calls[0][0]).toContain('e=spell%3A1');

        result.current.clear();
        expect(back).toHaveBeenCalled();
    });

    it('auto-selects the first visible without touching the URL', () => {
        const { result } = setup({ autoSelect: true });

        expect(result.current.selected).toBe('spell:1');
        expect(result.current.isOpen).toBe(false);
        expect(replace).not.toHaveBeenCalled();
    });

    it('reads section and entry from the initial URL', () => {
        query = 's=spells&e=spell:2';

        const { result, set } = setup();

        expect(set).toHaveBeenCalledWith('spells');
        expect(result.current.selected).toBe('spell:2');
        expect(result.current.isOpen).toBe(true);
    });

    it('drops the selection when it is no longer visible', () => {
        query = 'e=spell:9';

        const { result } = setup();

        expect(result.current.selected).toBeNull();
        expect(result.current.isOpen).toBe(false);
    });
});
