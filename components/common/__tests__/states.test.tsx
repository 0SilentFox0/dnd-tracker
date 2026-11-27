// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Swords } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    EmptyState,
    ErrorState,
    LoadingState,
    QueryState,
} from '@/components/common/states';
import { ApiError } from '@/lib/api/client';

const q = <T,>(
    over: Partial<{
        data: T;
        isPending: boolean;
        isError: boolean;
        error: unknown;
    }>
) =>
    ({
        data: undefined as T | undefined,
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        ...over,
    }) as never;

describe('стани сторінки', () => {
    afterEach(cleanup);

    it('EmptyState renders illustration slot', () => {
        const { container } = render(
            <EmptyState
                icon={Swords}
                illustration={<svg data-testid="ill" />}
                title="T"
            />
        );

        expect(screen.getByTestId('ill')).toBeTruthy();
        expect(
            container.querySelector('[data-slot="empty-state-illustration"]')
        ).toBeTruthy();
        expect(container.querySelectorAll('svg').length).toBe(1);
    });

    it('EmptyState: заголовок, опис, дія', () => {
        render(
            <EmptyState
                icon={Swords}
                title="Ще немає боїв"
                description="Створіть перший"
                action={<button>Новий бій</button>}
            />
        );

        expect(screen.getByText('Ще немає боїв')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Новий бій' })
        ).toBeInTheDocument();
    });

    it('LoadingState: N рядків-скелетонів і aria-busy', () => {
        const { container } = render(
            <LoadingState count={4} label="Завантаження скілів…" />
        );

        expect(
            container.querySelectorAll('[data-slot=skeleton-row]')
        ).toHaveLength(4);
        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByText('Завантаження скілів…')).toHaveClass('sr-only');
    });

    it.each([
        ['cards', 'skeleton-card', 2],
        ['list', 'skeleton-list-item', 2],
        ['detail', 'skeleton-paragraph', 4],
        ['form', 'skeleton-field', 6],
    ] as const)('LoadingState renders variant %s', (variant, slot, n) => {
        const { container } = render(<LoadingState variant={variant} count={2} />);

        expect(screen.getByRole('status')).toHaveAttribute(
            'data-variant',
            variant
        );
        expect(container.querySelectorAll(`[data-slot=${slot}]`)).toHaveLength(
            n
        );
        expect(container.querySelector('.ds-skeleton')).not.toBeNull();
    });

    it('ErrorState: текст ApiError і повтор', () => {
        const onRetry = vi.fn();

        render(
            <ErrorState
                error={new ApiError('Немає доступу', 403, '/x')}
                onRetry={onRetry}
            />
        );
        expect(screen.getByText('Немає доступу')).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole('button', { name: 'common.states.retry' })
        );
        expect(onRetry).toHaveBeenCalled();
    });

    it('ErrorState: невідома помилка — загальний текст', () => {
        render(<ErrorState error={42} />);
        expect(screen.getByText('common.states.error')).toBeInTheDocument();
    });

    it('QueryState: усі гілки', () => {
        const child = (d: string[]) => <p>дані: {d.join(',')}</p>;

        const { rerender } = render(
            <QueryState query={q({ isPending: true })} loading={<p>вантажу</p>}>
                {child}
            </QueryState>
        );

        expect(screen.getByText('вантажу')).toBeInTheDocument();

        rerender(
            <QueryState query={q({ isError: true, error: new Error('збій') })}>
                {child}
            </QueryState>
        );
        expect(screen.getByText('збій')).toBeInTheDocument();

        rerender(
            <QueryState query={q({ data: [] })} empty={<p>порожньо</p>}>
                {child}
            </QueryState>
        );
        expect(screen.getByText('порожньо')).toBeInTheDocument();

        rerender(
            <QueryState query={q({ data: ['a', 'b'] })} empty={<p>порожньо</p>}>
                {child}
            </QueryState>
        );
        expect(screen.getByText('дані: a,b')).toBeInTheDocument();
    });
});
