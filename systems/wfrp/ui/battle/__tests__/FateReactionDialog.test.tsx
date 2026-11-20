// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const hook = vi.hoisted(() => vi.fn());

vi.mock('@/systems/wfrp/hooks/useFateReaction', () => ({
    useFateReaction: hook,
}));

import { FateReactionDialog } from '../FateReactionDialog';
import { FateWaitingNotice } from '../FateWaitingNotice';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const rows = [{ key: 'k1', holderName: 'Hero', attackerName: 'Orc' }];

const state = (over: object) => ({
    open: false,
    waiting: false,
    rows,
    answer: vi.fn(),
    isSubmitting: false,
    ...over,
});

describe('FateReactionDialog', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders nothing when closed', () => {
        hook.mockReturnValue(state({}));

        const { container } = render(<FateReactionDialog />);

        expect(container.innerHTML).toBe('');
    });

    it('sends spend answer for every key in one call', () => {
        const s = state({ open: true });

        hook.mockReturnValue(s);

        render(<FateReactionDialog />);

        const buttons = screen.getAllByRole('button');

        const spend = buttons.find((b) => b.textContent?.includes('промах'));

        if (!spend) throw new Error('spend button missing');

        fireEvent.click(spend);
        fireEvent.click(buttons[buttons.length - 1]);

        expect(s.answer).toHaveBeenCalledWith({ k1: true });
    });

    it('defaults to taking the hit', () => {
        const s = state({ open: true });

        hook.mockReturnValue(s);

        render(<FateReactionDialog />);

        const buttons = screen.getAllByRole('button');

        fireEvent.click(buttons[buttons.length - 1]);

        expect(s.answer).toHaveBeenCalledWith({ k1: false });
    });
});

describe('FateWaitingNotice', () => {
    afterEach(cleanup);

    it('shows only while waiting', () => {
        hook.mockReturnValue(state({ waiting: true }));

        render(<FateWaitingNotice />);

        expect(screen.getByRole('status')).toBeTruthy();
    });

    it('hides otherwise', () => {
        hook.mockReturnValue(state({}));

        render(<FateWaitingNotice />);

        expect(screen.queryByRole('status')).toBeNull();
    });
});
