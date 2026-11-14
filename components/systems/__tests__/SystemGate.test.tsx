// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/states', () => ({
    LoadingState: () => <div data-testid="skeleton" />,
}));

const setup = async () => {
    vi.resetModules();

    const { SystemGate } = await import('../SystemGate');

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

    return { SystemGate, install, release };
};

describe('SystemGate', () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.resetModules();
    });

    it('renders the skeleton until loadSystems resolves, then the children', async () => {
        const { SystemGate, release } = await setup();

        render(
            <SystemGate system={{ key: 'wfrp' }}>
                <span data-testid="child" />
            </SystemGate>
        );

        expect(screen.getByTestId('skeleton')).toBeTruthy();
        expect(screen.queryByTestId('child')).toBeNull();

        await act(async () => {
            release();
        });

        expect(await screen.findByTestId('child')).toBeTruthy();
        expect(screen.queryByTestId('skeleton')).toBeNull();
    });

    it('uses the custom fallback', async () => {
        const { SystemGate } = await setup();

        render(
            <SystemGate system={{ key: 'wfrp' }} fallback={<i data-testid="fb" />}>
                <span />
            </SystemGate>
        );

        expect(screen.getByTestId('fb')).toBeTruthy();
    });

    it('a wfrp composition never calls the d20 loaders', async () => {
        const { SystemGate, install, release } = await setup();

        const d20 = vi.spyOn(install.LOADERS.d20, 'ui');

        render(
            <SystemGate system={{ key: 'wfrp' }}>
                <span data-testid="child" />
            </SystemGate>
        );

        await act(async () => {
            release();
        });

        await screen.findByTestId('child');
        expect(d20).not.toHaveBeenCalled();
    });
});
