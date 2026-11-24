// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { GridShapePicker } from '../GridShapePicker';
import { ToolsContent } from '../ToolsDrawer';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

afterEach(cleanup);

const MAP = { cols: 4, rows: 3, background: null, opacity: 0.3 };

describe('GridShapePicker', () => {
    it('square is selected and hex is disabled with a soon hint', () => {
        render(<GridShapePicker />);

        expect(
            screen
                .getByRole('button', { name: 'Квадрат' })
                .getAttribute('aria-pressed')
        ).toBe('true');

        const hex = screen.getByRole('button', {
            name: 'Гекс',
        }) as HTMLButtonElement;

        expect(hex.disabled).toBe(true);
        expect(hex.getAttribute('aria-disabled')).toBe('true');
        expect(screen.getByText('Гекс-сітка скоро')).toBeTruthy();

        fireEvent.click(hex);
        expect(
            screen
                .getByRole('button', { name: 'Квадрат' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });
});

describe('ToolsContent', () => {
    it('DM edit mode shows grid button, play mode hides the tools slot', () => {
        const { wrapper } = fakeScene({ isDM: true, map: MAP });

        const { container } = render(
            <ToolsContent
                audio={{ sound: false }}
                onToolsSlot={vi.fn()}
                onOpenDrawer={vi.fn()}
            />,
            { wrapper }
        );

        fireEvent.click(screen.getByRole('button', { name: 'Сітка' }));
        expect(screen.getByRole('button', { name: 'Гекс' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Грати' }));
        expect(screen.queryByRole('button', { name: 'Сітка' })).toBeNull();
        expect(
            container.querySelector('div.relative.flex.min-w-0')
        ).toHaveProperty('hidden', true);
    });

    it('does not add a light tool and the DM panel button opens the drawer', () => {
        const onOpenDrawer = vi.fn();

        const { wrapper } = fakeScene({ isDM: true, map: MAP });

        render(
            <ToolsContent
                audio={{ sound: false }}
                onOpenDrawer={onOpenDrawer}
            />,
            { wrapper }
        );

        expect(screen.queryByText('Світло')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'DM панель' }));
        expect(onOpenDrawer).toHaveBeenCalledWith('dm');
    });
});
