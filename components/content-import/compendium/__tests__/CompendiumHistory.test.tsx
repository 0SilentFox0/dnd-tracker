// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { CompendiumHistory } from '../history/CompendiumHistory';

import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.unmock('next-intl');
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('lists short ids with a summary only when the run has a report and opens the run', async () => {
    const report = {
        counts: { created: 2, updated: 1, unchanged: 0, errors: 0 },
    };

    vi.stubGlobal(
        'fetch',
        vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        runs: [
                            { id: 'abcdef123456', report },
                            { id: 'zzzzzz999999' },
                        ],
                        hasMore: false,
                    })
                )
        )
    );

    const openRun = vi.fn();

    await renderWithIntl(
        <QueryClientProvider client={new QueryClient()}>
            <CompendiumHistory
                campaignId="c"
                wizard={
                    {
                        actions: { openRun },
                    } as unknown as CompendiumImportController
                }
            />
        </QueryClientProvider>,
        { locale: 'uk', namespaces: ['common', 'validation', 'compendium'] }
    );

    await screen.findByText('Імпорт #abcdef');
    expect(screen.getByText('Записів: 3')).toBeTruthy();
    expect(screen.getAllByText(/Записів:/)).toHaveLength(1);
    fireEvent.click(
        screen.getByRole('button', { name: 'Відкрити звіт: Імпорт #zzzzzz' })
    );
    expect(openRun).toHaveBeenCalledWith({ id: 'zzzzzz999999' });
});
