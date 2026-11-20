// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModeSwitch } from '../ModeSwitch';

import { render } from '@/components/ui/__tests__/uk-intl';

vi.unmock('next-intl');

afterEach(cleanup);

describe('ModeSwitch', () => {
    it('exposes the current mode with aria-pressed', () => {
        render(<ModeSwitch value="build" onChange={vi.fn()} />);

        expect(
            screen
                .getByRole('button', { name: 'Побудова' })
                .getAttribute('aria-pressed')
        ).toBe('true');
        expect(
            screen
                .getByRole('button', { name: 'Гра' })
                .getAttribute('aria-pressed')
        ).toBe('false');
    });

    it('switches to the other mode and ignores the active one', () => {
        const onChange = vi.fn();

        render(<ModeSwitch value="build" onChange={onChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Побудова' }));

        expect(onChange).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Гра' }));

        expect(onChange).toHaveBeenCalledWith('play');
    });
});
