// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const actions = vi.hoisted(() => ({
    close: vi.fn(),
    roll: vi.fn(),
    auto: vi.fn(),
}));

const hook = vi.hoisted(() => vi.fn());

vi.mock('@/systems/wfrp/hooks/useChannelAction', () => ({
    useChannelAction: hook,
}));

import { ChannelDialog } from '../ChannelDialog';

import { render } from '@/lib/i18n/test/render-uk';
import type { BattleParticipant } from '@/types/battle';

vi.unmock('next-intl');

const hero = {} as BattleParticipant;

const setup = () => {
    hook.mockReturnValue({
        view: { pending: false, error: undefined, target: 40, banked: 2 },
        actions,
    });

    const onClose = vi.fn();

    render(<ChannelDialog hero={hero} open onClose={onClose} />);

    return onClose;
};

describe('ChannelDialog', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('passes its props to the hook', () => {
        const onClose = setup();

        expect(hook).toHaveBeenCalledWith(hero, {
            onClose,
            onDone: undefined,
        });
    });

    it('shows the target and rolls on the server', () => {
        setup();

        expect(screen.getByText('Ціль 40 · накопичено +2 РУ')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Авто-кидок' }));
        expect(actions.auto).toHaveBeenCalled();
    });

    it('sends a manual roll', () => {
        setup();

        fireEvent.click(screen.getByRole('button', { name: 'Ручний' }));
        fireEvent.change(screen.getByLabelText('1–100'), {
            target: { value: '37' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Кинути' }));
        expect(actions.roll).toHaveBeenCalledWith(37);
    });
});
