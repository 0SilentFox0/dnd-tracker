// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NotFound from '@/app/not-found';

const back = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));

describe('not-found', () => {
    afterEach(cleanup);

    it('shows BrokenD20 and two actions', () => {
        const { container } = render(<NotFound />);

        expect(
            container.querySelector('[data-slot="empty-state-illustration"] svg')
        ).toBeTruthy();
        expect(screen.getAllByRole('button').length).toBe(1);
        expect(
            screen.getByRole('link', { name: 'common.notFound.campaigns' })
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'common.notFound.back' })
        );
        expect(back).toHaveBeenCalled();
    });
});
