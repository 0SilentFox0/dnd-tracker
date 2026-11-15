// @vitest-environment happy-dom
import { Component, type ReactNode } from 'react';
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

    it('forgets the stale-chunk reload flag after a successful load', async () => {
        const { SystemGate, release } = await setup();

        sessionStorage.setItem('system-gate-reloaded', '1');

        render(
            <SystemGate system={{ key: 'wfrp' }}>
                <span data-testid="child" />
            </SystemGate>
        );

        await act(async () => {
            release();
        });

        await screen.findByTestId('child');
        expect(sessionStorage.getItem('system-gate-reloaded')).toBeNull();
    });

    it('uses the custom fallback', async () => {
        const { SystemGate } = await setup();

        render(
            <SystemGate
                system={{ key: 'wfrp' }}
                fallback={<i data-testid="fb" />}
            >
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

    it('a failed load throws once and does not restart the load on every render', async () => {
        const { SystemGate, install } = await setup();

        const rules = vi.fn(async () => {
            throw new Error('boom');
        });

        install.LOADERS.wfrp = { rules };

        class Boundary extends Component<
            { children: ReactNode },
            { error?: Error }
        > {
            state: { error?: Error } = {};

            static getDerivedStateFromError(error: Error) {
                return { error };
            }

            render() {
                return this.state.error ? (
                    <b data-testid="err">{this.state.error.message}</b>
                ) : (
                    this.props.children
                );
            }
        }

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { rerender } = render(
            <Boundary>
                <SystemGate system={{ key: 'wfrp' }}>
                    <span />
                </SystemGate>
            </Boundary>
        );

        expect(await screen.findByTestId('err')).toBeTruthy();

        const calls = rules.mock.calls.length;

        rerender(
            <Boundary>
                <SystemGate system={{ key: 'wfrp' }}>
                    <span />
                </SystemGate>
            </Boundary>
        );

        expect(rules.mock.calls.length).toBe(calls);
        spy.mockRestore();
    });

    it('a failure of a previous composition is not blamed on the current one', async () => {
        const { SystemGate, install, release } = await setup();

        let fail!: (e: Error) => void;

        install.LOADERS.homm = undefined as never;
        install.LOADERS.d20 = {
            rules: () => new Promise((_, reject) => (fail = reject)),
        };

        const view = render(
            <SystemGate system={{ key: 'dnd5e' }}>
                <span data-testid="child" />
            </SystemGate>
        );

        view.rerender(
            <SystemGate system={{ key: 'wfrp' }}>
                <span data-testid="child" />
            </SystemGate>
        );

        await act(async () => {
            fail(new Error('old'));
            release();
        });

        expect(await screen.findByTestId('child')).toBeTruthy();
    });
});
