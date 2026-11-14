// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/states', () => ({
    LoadingState: () => <div data-testid="skeleton" />,
}));

vi.mock('@/lib/i18n/extend-locale-scope', () => ({
    ExtendLocaleScope: ({ children }: { children: React.ReactNode }) =>
        children,
}));

vi.mock('@/lib/server/systems/campaign-system', () => ({
    systemOfCampaign: async () => ({ key: 'dnd5e' }),
    systemSelectionOfCampaign: async () => ({ key: 'dnd5e' }),
}));

afterEach(cleanup);

describe('battles layout', () => {
    it('keeps a lookup-calling battle page behind the campaign gate on a direct visit', async () => {
        vi.resetModules();

        const { ruleSystemOf } = await import(
            '@/lib/utils/rules/systems/lookup'
        );

        const { default: Layout } = await import('../layout');

        const Page = () => (
            <span data-testid="page">
                {ruleSystemOf({ system: { key: 'dnd5e' } } as never).key}
            </span>
        );

        expect(() => ruleSystemOf({ system: { key: 'dnd5e' } } as never)).toThrow();

        render(
            <QueryClientProvider client={new QueryClient()}>
                {await Layout({
                    children: <Page />,
                    params: Promise.resolve({ id: 'c1' }),
                })}
            </QueryClientProvider>
        );

        expect(screen.getByTestId('skeleton')).toBeTruthy();
        expect((await screen.findByTestId('page')).textContent).toBe('dnd5e');
    });
});
