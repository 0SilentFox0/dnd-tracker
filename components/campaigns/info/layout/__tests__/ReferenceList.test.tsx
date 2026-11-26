// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReferenceList } from '@/components/campaigns/info/layout/ReferenceList';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

afterEach(cleanup);

const groups = [
    { key: 'a', title: 'Група A', items: ['a1', 'a2'] },
    { key: 'b', title: 'Група B', items: ['b1', 'b2'] },
];

const setup = (props: Partial<Parameters<typeof ReferenceList<string>>[0]>) =>
    render(
        <ReferenceList<string>
            groups={groups}
            selected="a2"
            onSelect={vi.fn()}
            keyOf={(s) => s}
            renderRow={(s, row) => (
                <button
                    ref={row.ref}
                    tabIndex={row.tabIndex}
                    aria-current={row.selected ? 'true' : undefined}
                    onClick={row.onSelect}
                >
                    {s}
                </button>
            )}
            {...props}
        />
    );

describe('ReferenceList', () => {
    it('renders group headings and marks the selected row', () => {
        setup({});

        expect(screen.getByText('Група A')).toBeTruthy();
        expect(screen.getByText('Група B')).toBeTruthy();
        expect(screen.getByText('a2').getAttribute('aria-current')).toBe(
            'true'
        );
        expect(screen.getByText('a1').getAttribute('aria-current')).toBeNull();
    });

    it('selects a row on click', () => {
        const onSelect = vi.fn();

        setup({ onSelect });
        fireEvent.click(screen.getByText('b1'));

        expect(onSelect).toHaveBeenCalledWith('b1');
    });

    it('limits rows and offers show all', () => {
        const onShowAll = vi.fn();

        setup({ limit: 2, onShowAll });

        expect(screen.queryByText('b1')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Показати всі/ }));

        expect(onShowAll).toHaveBeenCalled();
    });

    it('moves focus with the arrow keys', () => {
        setup({});

        screen.getByText('a2').focus();
        fireEvent.keyDown(screen.getByText('a2'), { key: 'ArrowDown' });

        expect(document.activeElement).toBe(screen.getByText('b1'));
    });
});
