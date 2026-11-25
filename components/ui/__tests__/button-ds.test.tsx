// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HudChipTabs } from '@/components/hud/page/HudChipTabs';
import { Button } from '@/components/ui/button';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: Record<string, unknown>) => (
        <a href={href as string} {...rest}>
            {children as never}
        </a>
    ),
}));

describe('button DS', () => {
    it('keeps data-variant and data-size', () => {
        render(
            <Button variant="outline" size="sm">
                Go
            </Button>
        );

        const b = screen.getByRole('button');

        expect(b.getAttribute('data-variant')).toBe('outline');
        expect(b.getAttribute('data-size')).toBe('sm');
    });

    it('HudChipTabs marks only the active link as current page', () => {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

        render(
            <HudChipTabs
                ariaLabel="tabs"
                items={[
                    { key: 'a', label: 'A', href: '/a', active: true },
                    { key: 'b', label: 'B', href: '/b', active: false },
                ]}
            />
        );

        expect(screen.getByText('A').getAttribute('aria-current')).toBe('page');
        expect(screen.getByText('B').getAttribute('aria-current')).toBeNull();
    });
});
