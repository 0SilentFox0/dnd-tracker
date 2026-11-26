// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaletteSwitcher } from '../PaletteSwitcher';

const theme = vi.hoisted(() => ({ setPalette: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/layout/ThemeProvider', () => ({
    useTheme: () => ({
        palette: 'tavern',
        ready: true,
        saving: false,
        error: null,
        setPalette: theme.setPalette,
    }),
}));

afterEach(cleanup);

describe('PaletteSwitcher', () => {
    it('renders a labelled group of two pressable cards', () => {
        render(<PaletteSwitcher />);

        expect(screen.getByRole('group', { name: 'label' })).toBeTruthy();

        const buttons = screen.getAllByRole('button');

        expect(buttons).toHaveLength(2);
        expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
        expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    });

    it('selects an unselected palette on click', () => {
        render(<PaletteSwitcher />);

        fireEvent.click(screen.getAllByRole('button')[1]);

        expect(theme.setPalette).toHaveBeenCalledWith('parchment');
    });
});
