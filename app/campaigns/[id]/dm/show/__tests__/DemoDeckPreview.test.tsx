// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/show/stage/ShowStage', () => ({
    ShowStage: ({ show }: { show: { slide: { title: string } | null } }) => (
        <div data-testid="show-stage">{show.slide?.title ?? 'empty'}</div>
    ),
}));

import { DemoDeckPreview } from '@/app/campaigns/[id]/dm/show/[deckId]/preview/page-client';
import type { SlideDeck } from '@/types/show';

afterEach(cleanup);

const deck: SlideDeck = {
    id: 'd1',
    title: 'Sample',
    scenarioPageId: null,
    updatedAt: '',
    slides: [
        { id: 'slide0001', imageUrl: 'https://cdn.test/1.jpg', title: 'First' },
        {
            id: 'slide0002',
            imageUrl: 'https://cdn.test/2.jpg',
            title: 'Second',
        },
    ],
};

describe('DemoDeckPreview', () => {
    it('reuses ShowStage with local slide navigation', () => {
        render(<DemoDeckPreview campaignId="c1" deck={deck} />);
        expect(screen.getByTestId('show-stage').textContent).toBe('First');

        fireEvent.click(screen.getByRole('button', { name: 'nextSlide' }));
        expect(screen.getByTestId('show-stage').textContent).toBe('Second');
        fireEvent.click(screen.getByRole('button', { name: 'previousSlide' }));
        expect(screen.getByTestId('show-stage').textContent).toBe('First');
    });
});
