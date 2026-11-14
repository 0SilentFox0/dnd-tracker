// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/states', () => ({
    LoadingState: () => <div data-testid="skeleton" />,
}));

let live: { key: string; modules?: string[] } | undefined;

vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignSystemSelection: () => live,
}));

const setup = async () => {
    vi.resetModules();

    const { CampaignSystemGate } = await import('../CampaignSystemGate');

    const install = await import('../install');

    let release!: () => void;

    const gate = new Promise<void>((resolve) => (release = resolve));

    for (const id of Object.keys(install.LOADERS))
        install.LOADERS[id] = {
            rules: async () => {
                await gate;

                return {} as never;
            },
            ui: async () => ({}) as never,
        };

    return { CampaignSystemGate, install, release };
};

describe('CampaignSystemGate', () => {
    beforeEach(() => {
        live = undefined;
    });

    afterEach(cleanup);

    it('shows the skeleton for the seeded composition, then the children', async () => {
        const { CampaignSystemGate, release } = await setup();

        render(
            <CampaignSystemGate campaignId="c1" system={{ key: 'wfrp' }}>
                <span data-testid="child" />
            </CampaignSystemGate>
        );

        expect(screen.getByTestId('skeleton')).toBeTruthy();

        await act(async () => {
            release();
        });

        expect(await screen.findByTestId('child')).toBeTruthy();
    });

    it('renders the children as is without a composition', async () => {
        const { CampaignSystemGate } = await setup();

        render(
            <CampaignSystemGate campaignId="c1" system={null}>
                <span data-testid="child" />
            </CampaignSystemGate>
        );

        expect(screen.getByTestId('child')).toBeTruthy();
    });

    it('loaded rules replace the seeded composition and load only its modules', async () => {
        const { CampaignSystemGate, install, release } = await setup();

        live = { key: 'wfrp' };

        const d20 = vi.spyOn(install.LOADERS.d20, 'ui');

        render(
            <CampaignSystemGate campaignId="c1" system={{ key: 'dnd5e' }}>
                <span data-testid="child" />
            </CampaignSystemGate>
        );

        await act(async () => {
            release();
        });

        await screen.findByTestId('child');
        expect(d20).not.toHaveBeenCalled();
    });

    it('a failed load reaches the error boundary', async () => {
        const { CampaignSystemGate, install } = await setup();

        install.LOADERS.wfrp = {
            rules: async () => {
                throw new Error('boom');
            },
        };

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { Component } = await import('react');

        class Boundary extends Component<
            { children: React.ReactNode },
            { error?: Error }
        > {
            state: { error?: Error } = {};

            static getDerivedStateFromError(error: Error) {
                return { error };
            }

            render() {
                return this.state.error ? (
                    <b data-testid="err" />
                ) : (
                    this.props.children
                );
            }
        }

        render(
            <Boundary>
                <CampaignSystemGate campaignId="c1" system={{ key: 'wfrp' }}>
                    <span />
                </CampaignSystemGate>
            </Boundary>
        );

        expect(await screen.findByTestId('err')).toBeTruthy();
        spy.mockRestore();
    });
});
