// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DoorMenu } from '../DoorMenu';

import type { MapDoorsTool } from '@/lib/hooks/battle';

afterEach(cleanup);

function tool(): MapDoorsTool {
    return {
        showLock: true,
        menu: '1:1:e',
        press: vi.fn(),
        act: vi.fn(),
        close: vi.fn(),
    };
}

const renderMenu = (door: { open: boolean; locked?: boolean }, t = tool()) => {
    render(
        <DoorMenu
            edge="1:1:e"
            door={door}
            pxPerUnit={1}
            rotated={false}
            tool={t}
        />
    );

    return t;
};

describe('DoorMenu', () => {
    it('is a labelled group, not a menu without menuitems', () => {
        renderMenu({ open: false });

        expect(
            screen.getByRole('group', { name: 'battle.map.doors.menu' })
        ).toBeTruthy();
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('opens a closed door and locks it', () => {
        const t = renderMenu({ open: false, locked: false });

        fireEvent.click(screen.getByRole('button', { name: 'battle.map.doors.open' }));
        expect(t.act).toHaveBeenCalledWith('1:1:e', { open: true });

        fireEvent.click(screen.getByRole('button', { name: 'battle.map.doors.lock' }));
        expect(t.act).toHaveBeenCalledWith('1:1:e', { locked: true });
    });

    it('offers no lock toggle for an open door', () => {
        renderMenu({ open: true });

        expect(screen.getByRole('button', { name: 'battle.map.doors.close' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'battle.map.doors.lock' })).toBeNull();
    });

    it('focuses the first action and closes on Escape', () => {
        const t = renderMenu({ open: false });

        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'battle.map.doors.open' })
        );

        fireEvent.keyDown(screen.getByRole('group'), { key: 'Escape' });

        expect(t.close).toHaveBeenCalledOnce();
    });
});
