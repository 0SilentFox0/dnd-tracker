// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpellReferenceRow } from '@/components/campaigns/info/rows/SpellReferenceRow';
import { render } from '@/lib/i18n/test/render-uk';
import type { SpellForReference } from '@/types/info-reference';

vi.unmock('next-intl');

afterEach(cleanup);

const spell = {
    id: '1',
    name: 'Вогняна куля',
    level: 3,
    groupName: 'Вогонь',
    icon: null,
} as SpellForReference;

describe('reference rows', () => {
    it('marks only the selected row and reports clicks', () => {
        const onSelect = vi.fn();

        const { rerender } = render(
            <SpellReferenceRow
                item={spell}
                selected={false}
                onSelect={onSelect}
            />
        );

        const row = screen.getByRole('button', { name: /Вогняна куля/ });

        expect(row.getAttribute('aria-current')).toBeNull();

        fireEvent.click(row);
        expect(onSelect).toHaveBeenCalledTimes(1);

        rerender(
            <SpellReferenceRow item={spell} selected onSelect={onSelect} />
        );

        expect(
            screen
                .getByRole('button', { name: /Вогняна куля/ })
                .getAttribute('aria-current')
        ).toBe('true');
        expect(screen.getByText('рів. 3 · Вогонь')).toBeTruthy();
    });
});
