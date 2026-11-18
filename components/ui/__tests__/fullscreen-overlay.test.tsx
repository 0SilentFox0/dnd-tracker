// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { FullscreenOverlay } from '@/components/ui/fullscreen-overlay';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;

function mount(props: Partial<Omit<Parameters<typeof FullscreenOverlay>[0], 'children'>> = {}) {
    const host = document.createElement('div');

    document.body.appendChild(host);

    act(() => {
        createRoot(host).render(
            <FullscreenOverlay label="Result" className="z-50" {...props}>
                body
            </FullscreenOverlay>
        );
    });

    return host.firstElementChild as HTMLElement;
}

describe('FullscreenOverlay', () => {
    it('renders a labelled fixed dialog', () => {
        const el = mount({ modal: true });

        expect(el.getAttribute('role')).toBe('dialog');
        expect(el.getAttribute('aria-label')).toBe('Result');
        expect(el.getAttribute('aria-modal')).toBe('true');
        expect(el.className).toContain('fixed inset-0');
        expect(el.className).toContain('z-50');
    });

    it('omits aria-modal by default and forwards clicks', () => {
        const onClick = vi.fn();

        const el = mount({ onClick });

        expect(el.hasAttribute('aria-modal')).toBe(false);

        act(() => el.click());

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
