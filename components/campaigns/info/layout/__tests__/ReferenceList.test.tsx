// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReferenceList } from '../ReferenceList';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const items = [{ id: '1' }, { id: '2' }, { id: '3' }];

function renderList(props: Partial<Parameters<typeof ReferenceList>[0]> = {}) {
    return renderWithIntl(
        <ReferenceList
            groups={[{ key: 'g', title: 'Group', items }]}
            selected="2"
            renderRow={(item, selected) => (
                <button
                    data-ref-row
                    aria-current={selected ? 'true' : undefined}
                >
                    row-{item.id}
                </button>
            )}
            {...props}
        />,
        { locale: 'en', namespaces: ['common', 'dashboard'] }
    );
}

describe('ReferenceList', () => {
    it('caps rows at the limit and offers show-all', async () => {
        const onShowAll = vi.fn();

        await renderList({ limit: 2, onShowAll });

        expect(screen.queryByText('row-3')).toBeNull();

        fireEvent.click(screen.getByText(/3/, { selector: 'button' }));
        expect(onShowAll).toHaveBeenCalled();
    });

    it('marks the selected row and moves focus with arrows', async () => {
        await renderList();

        expect(screen.getByText('row-2').getAttribute('aria-current')).toBe(
            'true'
        );

        screen.getByText('row-1').focus();
        fireEvent.keyDown(screen.getByText('row-1'), { key: 'ArrowDown' });
        expect(document.activeElement).toBe(screen.getByText('row-2'));
    });
});
