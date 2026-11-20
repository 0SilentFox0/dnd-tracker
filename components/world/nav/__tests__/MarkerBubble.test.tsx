// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarkerBubble } from '../MarkerBubble';

import { render } from '@/components/ui/__tests__/uk-intl';

vi.unmock('next-intl');

afterEach(cleanup);

const marker = {
    name: 'Таверна',
    description: 'Тепле місце',
    icon: 'camp',
    kind: 'point' as const,
    childMapId: null,
};

describe('MarkerBubble', () => {
    it('shows name, description and the base actions', () => {
        const onMore = vi.fn();

        const onClose = vi.fn();

        render(<MarkerBubble marker={marker} actions={{ onMore, onClose }} />);

        expect(screen.getByText('Таверна')).toBeTruthy();
        expect(screen.getByText('Тепле місце')).toBeTruthy();
        expect(screen.queryByText('Відкрити карту')).toBeNull();

        fireEvent.click(screen.getByText('Докладніше'));
        fireEvent.click(screen.getByLabelText('Закрити'));

        expect(onMore).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('offers Open map only when onOpenMap is given', () => {
        const onOpenMap = vi.fn();

        render(
            <MarkerBubble
                marker={marker}
                actions={{ onMore: vi.fn(), onClose: vi.fn(), onOpenMap }}
            />
        );
        fireEvent.click(screen.getByText('Відкрити карту'));

        expect(onOpenMap).toHaveBeenCalled();
    });

    it('children replace the static title and description', () => {
        render(
            <MarkerBubble
                marker={marker}
                actions={{ onMore: vi.fn(), onClose: vi.fn() }}
            >
                <input aria-label="edit" />
            </MarkerBubble>
        );

        expect(screen.getByLabelText('edit')).toBeTruthy();
        expect(screen.queryByText('Тепле місце')).toBeNull();
    });

    it('embedded drops the name and the close button but keeps the description', () => {
        render(
            <MarkerBubble
                embedded
                marker={marker}
                actions={{ onMore: vi.fn(), onClose: vi.fn() }}
            />
        );

        expect(screen.queryByText(marker.name)).toBeNull();
        expect(screen.getByText('Тепле місце')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Закрити' })).toBeNull();
    });
});
