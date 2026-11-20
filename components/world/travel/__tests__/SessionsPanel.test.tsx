// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionsPanel } from '../SessionsPanel';

import { renderWithConfirm } from '@/components/ui/__tests__/uk-intl';
import * as api from '@/lib/api/world';
import { WORLD_SESSION_COLORS } from '@/lib/constants/world';
import type { WorldSession } from '@/types/world';

vi.unmock('next-intl');

vi.mock('@/lib/api/world');

const session = (over: Partial<WorldSession> = {}): WorldSession => ({
    id: 's1',
    name: 'Похід',
    description: null,
    color: '#c0504d',
    startedAt: '2026-11-20T10:00:00.000Z',
    endedAt: null,
    active: true,
    ...over,
});

const renderPanel = () =>
    renderWithConfirm(
        <QueryClientProvider
            client={
                new QueryClient({
                    defaultOptions: { queries: { retry: false } },
                })
            }
        >
            <SessionsPanel campaignId="c1" />
        </QueryClientProvider>
    );

beforeEach(() => {
    vi.mocked(api.getSessions).mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SessionsPanel', () => {
    it('shows the empty state', async () => {
        renderPanel();

        expect(await screen.findByText('Сесій ще немає')).toBeTruthy();
    });

    it('starts a new session with the form data', async () => {
        vi.mocked(api.startSession).mockResolvedValue(session());

        renderPanel();

        fireEvent.click(
            await screen.findByRole('button', { name: /Нова сесія/ })
        );

        fireEvent.change(await screen.findByLabelText(/Назва/), {
            target: { value: ' Похід ' },
        });
        fireEvent.change(screen.getByLabelText('Опис'), {
            target: { value: 'Перший' },
        });
        fireEvent.click(
            screen.getByRole('radio', {
                name: `Колір ${WORLD_SESSION_COLORS[1]}`,
            })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Створити' }));

        await waitFor(() =>
            expect(api.startSession).toHaveBeenCalledWith('c1', {
                name: 'Похід',
                description: 'Перший',
                color: WORLD_SESSION_COLORS[1],
            })
        );
    });

    it('ends the active session', async () => {
        vi.mocked(api.getSessions).mockResolvedValue([session()]);
        vi.mocked(api.updateSession).mockResolvedValue(
            session({ active: false })
        );

        renderPanel();

        expect(await screen.findByText('Активна')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Завершити: Похід' })
        );

        await waitFor(() =>
            expect(api.updateSession).toHaveBeenCalledWith('c1', 's1', {
                end: true,
            })
        );
    });
});
