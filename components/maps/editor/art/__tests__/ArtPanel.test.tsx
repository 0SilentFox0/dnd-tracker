// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtPanel } from '../ArtPanel';

import { ConfirmContext } from '@/lib/hooks/common/confirm-context';
import { makeT } from '@/lib/i18n/test/mock-t';

const detach = vi.hoisted(() => vi.fn());

vi.mock('next-intl', async (orig) => ({
    ...(await orig<object>()),
    useTranslations: (namespace?: string) => makeT(namespace),
}));
vi.mock('@/lib/hooks/battle-maps/useMapArt', () => ({
    useDeleteMapArt: () => ({ mutateAsync: detach, isPending: false }),
}));

afterEach(() => {
    cleanup();
    detach.mockReset();
});

const save = {
    save: vi.fn(),
    phase: 'idle',
    needsBake: true,
    lastBake: null,
    isSaving: false,
};

function makeArt(overrides: Record<string, unknown> = {}) {
    return {
        active: true,
        scene: {
            lights: [],
            ambient: { tint: '#000000', darkness: 0 },
        },
        tool: null,
        setTool: vi.fn(),
        clearNotice: vi.fn(),
        start: vi.fn(),
        reset: vi.fn(),
        setAmbient: vi.fn(),
        brush: { size: 1, setSize: vi.fn() },
        materials: { set: vi.fn() },
        lights: { selectedId: null },
        ...overrides,
    };
}

function renderPanel(art: ReturnType<typeof makeArt>, confirm: boolean) {
    render(
        <ConfirmContext.Provider value={(async () => confirm) as never}>
            <ArtPanel
                art={art as never}
                artSave={save as never}
                ids={{ campaignId: 'c1', mapId: 'm1' }}
            />
        </ConfirmContext.Provider>
    );
}

describe('ArtPanel', () => {
    it('offers to start art while it is inactive', () => {
        const art = makeArt({ active: false });

        renderPanel(art, true);
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.editor.art.start' })
        );

        expect(art.start).toHaveBeenCalledTimes(1);
    });

    it('picks a tool and enables baking only when the background is stale', () => {
        const art = makeArt();

        renderPanel(art, true);
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.editor.art.tool.wall' })
        );

        expect(art.setTool).toHaveBeenCalledWith('wall');
        expect(
            (
                screen.getByRole('button', {
                    name: 'maps.editor.art.bake',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(false);
        expect(screen.getByText('maps.editor.art.bakeStale')).toBeTruthy();
    });

    it('keeps the art when detaching is not confirmed', async () => {
        const art = makeArt();

        renderPanel(art, false);
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.editor.art.detach' })
        );
        await Promise.resolve();

        expect(detach).not.toHaveBeenCalled();
        expect(art.reset).not.toHaveBeenCalled();
    });

    it('deletes the art and resets the editor after confirmation', async () => {
        const art = makeArt();

        renderPanel(art, true);
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.editor.art.detach' })
        );
        await vi.waitFor(() => expect(art.reset).toHaveBeenCalledTimes(1));

        expect(detach).toHaveBeenCalledTimes(1);
    });
});
