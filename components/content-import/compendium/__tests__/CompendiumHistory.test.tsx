// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { CompendiumHistory } from '../report/CompendiumHistory';

import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('shows a short run label with a summary and opens the report', async () => {
    const run = {
        id: 'abcdef123456789',
        report: { counts: { created: 3, updated: 1, unchanged: 0, errors: 0 } },
    };

    vi.stubGlobal(
        'fetch',
        vi.fn(
            async () =>
                new Response(JSON.stringify({ runs: [run], hasMore: false }))
        )
    );

    const openRun = vi.fn();

    const { container } = render(
        <QueryClientProvider client={new QueryClient()}>
            <CompendiumHistory
                campaignId="c"
                wizard={
                    { actions: { openRun } } as unknown as CompendiumImportController
                }
            />
        </QueryClientProvider>
    );

    fireEvent.click(
        await screen.findByRole('button', { name: 'compendium.history.open' })
    );
    expect(openRun).toHaveBeenCalledWith(run);
    expect(container.textContent).not.toContain('abcdef123456789');
    expect(container.textContent).toContain('compendium.history.row');
});
