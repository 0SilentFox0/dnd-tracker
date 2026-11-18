// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Disclosure } from '@/components/ui/disclosure';

describe('Disclosure', () => {
    afterEach(cleanup);

    it('keeps closed content mounted but hidden', () => {
        render(<Disclosure summary="More">body</Disclosure>);

        expect(
            screen
                .getByText('body')
                .closest('[data-state]')
                ?.getAttribute('data-state')
        ).toBe('closed');
    });

    it('reports changes and follows the controlled open prop', () => {
        const onOpenChange = vi.fn();

        const { rerender } = render(
            <Disclosure summary="More" open={false} onOpenChange={onOpenChange}>
                body
            </Disclosure>
        );

        fireEvent.click(screen.getByRole('button', { name: /More/ }));
        expect(onOpenChange).toHaveBeenCalledWith(true);
        expect(
            screen
                .getByText('body')
                .closest('[data-state]')
                ?.getAttribute('data-state')
        ).toBe('closed');

        rerender(
            <Disclosure summary="More" open onOpenChange={onOpenChange}>
                body
            </Disclosure>
        );
        expect(
            screen
                .getByText('body')
                .closest('[data-state]')
                ?.getAttribute('data-state')
        ).toBe('open');
    });

    it('renders the header as the requested heading level', () => {
        render(
            <Disclosure summary="Title" headingLevel={3}>
                body
            </Disclosure>
        );

        expect(
            screen.getByRole('heading', { level: 3 }).querySelector('button')
        ).not.toBeNull();
    });
});
