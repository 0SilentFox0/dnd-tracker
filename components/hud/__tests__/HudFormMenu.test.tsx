// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HudFormMenu } from '@/components/hud';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';

const openMenu = () => {
    const trigger = screen.getByRole('button', { name: 'common.actions.more' });

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
};

beforeEach(() => mockMatchMedia(false));
afterEach(cleanup);

describe('HudFormMenu', () => {
    it('runs onSelect for an item without confirm', async () => {
        const onSelect = vi.fn();

        renderWithConfirm(
            <HudFormMenu items={[{ label: 'Rename', onSelect }]} />
        );
        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('skips onSelect when the confirmation is declined', async () => {
        const onSelect = vi.fn();

        renderWithConfirm(
            <HudFormMenu
                items={[
                    {
                        label: 'Delete',
                        tone: 'danger',
                        onSelect,
                        confirm: { title: 'Sure?', confirmLabel: 'Yes' },
                    },
                ]}
            />
        );
        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
        fireEvent.click(await screen.findByRole('button', { name: 'common.actions.cancel' }));
        await act(async () => {});
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('runs onSelect after the confirmation is accepted', async () => {
        const onSelect = vi.fn();

        renderWithConfirm(
            <HudFormMenu
                items={[
                    {
                        label: 'Delete',
                        onSelect,
                        confirm: { title: 'Sure?', confirmLabel: 'Yes' },
                    },
                ]}
            />
        );
        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));
        await act(async () => {});
        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});
