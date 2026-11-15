// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapFogToolbar } from '../MapFogToolbar';

import type { MapFogTool } from '@/lib/hooks/battle';

afterEach(cleanup);

describe('MapFogToolbar', () => {
    it('exposes labeled, keyboard-operable mode and brush buttons', () => {
        const setMode = vi.fn();

        const setBrush = vi.fn();

        const tool = {
            mode: 'reveal',
            radius: 8,
            brush: 'brush',
            setMode,
            setBrush,
            setRadius: vi.fn(),
        } as unknown as MapFogTool;

        render(<MapFogToolbar tool={tool} />);

        const vision = screen.getByRole('button', { name: 'battle.map.fog.modes.vision' });

        expect(vision.getAttribute('aria-pressed')).toBe('false');
        fireEvent.keyDown(vision, { key: 'Enter' });
        fireEvent.click(vision);
        expect(setMode).toHaveBeenCalledWith('vision');

        const room = screen.getByRole('button', { name: 'battle.map.fog.brushes.room' });

        fireEvent.click(room);
        expect(setBrush).toHaveBeenCalledWith('room');
    });

    it('shows an accessible vision-radius control in vision mode', () => {
        render(
            <MapFogToolbar
                tool={{
                    mode: 'vision',
                    radius: 11,
                    brush: 'brush',
                    setMode: vi.fn(),
                    setBrush: vi.fn(),
                    setRadius: vi.fn(),
                    commitRadius: vi.fn(),
                } as unknown as MapFogTool}
            />
        );

        expect(screen.getByRole('slider', { name: 'battle.map.fog.radius' })).toBeTruthy();
        expect(screen.getByText('11')).toBeTruthy();
    });
});
