// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HudSplit } from '@/components/hud/page';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';

vi.mock('@/components/ui/responsive-dialog', () => ({
    ResponsiveDialog: ({
        open,
        children,
    }: {
        open: boolean;
        children: React.ReactNode;
    }) => (open ? <div data-testid="dialog">{children}</div> : null),
}));

afterEach(cleanup);

describe('HudSplit', () => {
    it('renders rail/main/aside on desktop', () => {
        mockMatchMedia(false);

        render(
            <HudSplit
                rail={<nav>rail</nav>}
                aside={{
                    content: 'side',
                    title: 'Side',
                    mobile: { open: true, onClose: vi.fn() },
                }}
            >
                main
            </HudSplit>
        );

        expect(screen.getByText('rail')).toBeTruthy();
        expect(screen.getByText('main')).toBeTruthy();
        expect(screen.getByRole('complementary')).toHaveTextContent('side');
        expect(screen.queryByTestId('dialog')).toBeNull();
    });

    it('aside goes to dialog on mobile object mode', () => {
        mockMatchMedia(true);

        render(
            <HudSplit
                aside={{
                    content: 'side',
                    title: 'Side',
                    mobile: { open: true, onClose: vi.fn() },
                }}
            >
                main
            </HudSplit>
        );

        expect(screen.getByTestId('dialog')).toHaveTextContent('side');
        expect(screen.queryByRole('complementary')).toBeNull();
    });

    it('stack mode keeps the aside in the flow on mobile', () => {
        mockMatchMedia(true);

        render(
            <HudSplit
                aside={{ content: 'side', title: 'Side', mobile: 'stack' }}
            >
                main
            </HudSplit>
        );

        expect(screen.getByRole('complementary')).toHaveTextContent('side');
        expect(screen.queryByTestId('dialog')).toBeNull();
    });
});
