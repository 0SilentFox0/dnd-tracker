// @vitest-environment happy-dom
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleMapPanel } from '../panels/BattleMapPanel';

import { TooltipProvider } from '@/components/ui/tooltip';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';

const library = vi.hoisted(() => ({ version: 2 }));

vi.mock('@/components/battle/use-system-battle-ui', () => ({
    useSystemFx: () => undefined,
}));
vi.mock('@/lib/hooks/battle-maps', async (orig) => ({
    ...(await orig<object>()),
    useBattleMaps: () => ({
        data: [{ id: 'm1', version: library.version }],
    }),
}));

vi.unmock('next-intl');

afterEach(cleanup);

vi.stubGlobal(
    'ResizeObserver',
    class {
        constructor(
            private cb: (
                e: { contentRect: { width: number; height: number } }[]
            ) => void
        ) {}
        observe() {
            this.cb([{ contentRect: { width: 800, height: 600 } }]);
        }
        disconnect() {}
        unobserve() {}
    }
);

function panel(opts: { isDM?: boolean; linked?: boolean; confirm?: boolean }) {
    const scene = fakeScene({
        isDM: opts.isDM ?? true,
        map: { cols: 10, rows: 5, background: null, opacity: 0.3 },
        confirmAnswer: opts.confirm ?? true,
        ...(opts.linked !== false && { mapRef: { mapId: 'm1', version: 1 } }),
    });

    scene.me.battleData.position = { x: 0, y: 0 };

    const Wrapper = scene.wrapper;

    const view = render(
        <Wrapper>
            <TooltipProvider>
                <BattleMapPanel />
            </TooltipProvider>
        </Wrapper>
    );

    return { scene, ...view };
}

describe('update map button', () => {
    it('is hidden for non-linked battles and for players', () => {
        expect(
            panel({ linked: false }).queryByRole('button', {
                name: 'Оновити карту',
            })
        ).toBeNull();

        cleanup();

        expect(
            panel({ isDM: false }).queryByRole('button', {
                name: 'Оновити карту',
            })
        ).toBeNull();
    });

    it('is disabled with a hint when the map is up to date', () => {
        library.version = 1;

        const button = panel({}).getByRole('button', {
            name: 'Оновити карту',
        });

        expect(button.hasAttribute('disabled')).toBe(true);
        expect(button.getAttribute('title')).toBe('Карта актуальна');
    });

    it('confirms and runs the update when a newer version exists', async () => {
        library.version = 2;

        const { scene, getByRole } = panel({});

        fireEvent.click(getByRole('button', { name: 'Оновити карту' }));

        await waitFor(() =>
            expect(scene.value.actions.mapUpdate.mutate).toHaveBeenCalledTimes(
                1
            )
        );

        expect(scene.confirm).toHaveBeenCalledTimes(1);
        expect(scene.value.actions.mapUpdate.mutate).toHaveBeenCalledWith(
            {},
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('does not update when the dialog is declined', async () => {
        library.version = 2;

        const { scene, getByRole } = panel({ confirm: false });

        fireEvent.click(getByRole('button', { name: 'Оновити карту' }));

        await waitFor(() => expect(scene.confirm).toHaveBeenCalled());

        expect(scene.value.actions.mapUpdate.mutate).not.toHaveBeenCalled();
    });

    it('notifies on success', async () => {
        library.version = 2;

        const { scene, getByRole } = panel({});

        fireEvent.click(getByRole('button', { name: 'Оновити карту' }));

        await waitFor(() =>
            expect(scene.value.actions.mapUpdate.mutate).toHaveBeenCalled()
        );

        const [, opts] = vi.mocked(scene.value.actions.mapUpdate.mutate).mock
            .calls[0] as unknown as [object, { onSuccess(): void }];

        opts.onSuccess();

        expect(scene.toast.show).toHaveBeenCalledWith('Карту оновлено');
    });
});
