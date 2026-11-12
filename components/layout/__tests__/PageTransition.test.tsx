// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pathname: '/campaigns/c' }));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));

import { PageTransition } from '@/components/layout/PageTransition';

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <button type="button" onClick={() => setCount((value) => value + 1)}>
            count:{count}
        </button>
    );
}

afterEach(() => {
    cleanup();
    mocks.pathname = '/campaigns/c';
});

describe('PageTransition', () => {
    it('keeps the child state across route changes and replays the fade', () => {
        const view = render(
            <PageTransition>
                <Counter />
            </PageTransition>
        );

        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('button').textContent).toBe('count:1');

        mocks.pathname = '/campaigns/c/dm/scenario';
        view.rerender(
            <PageTransition>
                <Counter />
            </PageTransition>
        );

        expect(screen.getByRole('button').textContent).toBe('count:1');
        expect(view.container.querySelector('.page-transition')).toBeTruthy();
    });
});
