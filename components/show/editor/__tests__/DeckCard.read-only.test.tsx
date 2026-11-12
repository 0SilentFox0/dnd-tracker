// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/hooks/common', () => ({ useConfirm: () => vi.fn() }));

import { DeckCard } from '@/components/show/editor/DeckCard';

afterEach(cleanup);

describe('DeckCard read-only mode', () => {
    it('offers a preview link without edit, start-show, or delete actions', () => {
        render(
            <DeckCard
                deck={{
                    id: 'd1',
                    title: 'Sample',
                    scenarioPageId: null,
                    slideCount: 2,
                    coverUrl: null,
                    updatedAt: '',
                }}
                href="/campaigns/c/dm/show/d1/preview"
                canEdit={false}
            />
        );

        expect(
            screen
                .getByRole('link', { name: 'decksPage.preview' })
                .getAttribute('href')
        ).toBe('/campaigns/c/dm/show/d1/preview');
        expect(
            screen.queryByRole('button', { name: 'show.startShow' })
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'common.actions.delete' })
        ).toBeNull();
        expect(
            screen.queryByRole('link', { name: 'common.actions.edit' })
        ).toBeNull();
    });
});
