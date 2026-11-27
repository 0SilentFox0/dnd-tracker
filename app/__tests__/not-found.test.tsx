// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NotFound from '@/app/not-found';

const back = vi.fn();

const push = vi.fn();

let pathname = '/nope';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ back, push }),
    usePathname: () => pathname,
}));

describe('not-found', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        pathname = '/nope';
    });

    it('shows BrokenD20, back button and home link', () => {
        const { container } = render(<NotFound />);

        expect(
            container.querySelector(
                '[data-slot="empty-state-illustration"] svg'
            )
        ).toBeTruthy();
        expect(screen.getAllByRole('button').length).toBe(1);
        expect(
            screen.getByRole('link', { name: 'common.notFound.home' })
        ).toBeTruthy();
    });

    it('goes back when history exists, else to campaigns', () => {
        render(<NotFound />);

        const btn = screen.getByRole('button', {
            name: 'common.notFound.back',
        });

        vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
        fireEvent.click(btn);
        expect(back).toHaveBeenCalled();

        vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
        fireEvent.click(btn);
        expect(push).toHaveBeenCalledWith('/campaigns');
    });

    it('links to the campaign on nested campaign paths', () => {
        pathname = '/campaigns/c1/foo';
        render(<NotFound />);
        expect(
            screen.getByRole('link', { name: 'common.notFound.campaign' })
        ).toBeTruthy();
    });
});
