// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { ChannelDialog } from '../ChannelDialog';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const model = () => {
    const actions = {
        open: vi.fn(),
        close: vi.fn(),
        roll: vi.fn(),
        auto: vi.fn(),
    };

    return {
        channel: {
            view: {
                open: true,
                pending: false,
                error: undefined,
                target: 40,
                banked: 2,
            },
            actions,
        } as never,
        actions,
    };
};

describe('ChannelDialog', () => {
    afterEach(cleanup);

    it('shows the target and rolls on the server', () => {
        const { channel, actions } = model();

        render(<ChannelDialog channel={channel} />);
        expect(screen.getByText('Ціль 40 · накопичено +2 РУ')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Авто-кидок' }));
        expect(actions.auto).toHaveBeenCalled();
    });

    it('sends a manual roll', () => {
        const { channel, actions } = model();

        render(<ChannelDialog channel={channel} />);
        fireEvent.click(screen.getByRole('button', { name: 'Ручний' }));
        fireEvent.change(screen.getByLabelText('1–100'), {
            target: { value: '37' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Кинути' }));
        expect(actions.roll).toHaveBeenCalledWith(37);
    });
});
