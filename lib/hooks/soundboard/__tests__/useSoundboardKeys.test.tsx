// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSoundboardKeys } from '../useSoundboardKeys';

import type { Sound } from '@/types/soundboard';

const pads = ['a', 'b', 'c'].map(
    (id, i) =>
        ({ id, source: 'custom', name: id, sortOrder: i }) as unknown as Sound
);

function Host({
    list,
    play,
}: {
    list: Sound[] | null;
    play: (s: Sound) => void;
}) {
    useSoundboardKeys(list, play);

    return <input data-testid="field" />;
}

describe('useSoundboardKeys', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('plays the nth pad on a digit key', () => {
        const play = vi.fn();

        render(<Host list={pads} play={play} />);
        fireEvent.keyDown(document.body, { key: '3' });

        expect(play).toHaveBeenCalledWith(pads[2]);
    });

    it('ignores auto-repeated keydown', () => {
        const play = vi.fn();

        render(<Host list={pads} play={play} />);
        fireEvent.keyDown(document.body, { key: '1', repeat: true });

        expect(play).not.toHaveBeenCalled();
    });

    it('ignores typing, dialogs, modifiers, missing pads and null', () => {
        const play = vi.fn();

        const { getByTestId, rerender } = render(
            <Host list={pads} play={play} />
        );

        fireEvent.keyDown(getByTestId('field'), { key: '1' });
        fireEvent.keyDown(document.body, { key: '1', ctrlKey: true });
        fireEvent.keyDown(document.body, { key: '1', shiftKey: true });
        fireEvent.keyDown(document.body, { key: '1', altKey: true });
        fireEvent.keyDown(document.body, { key: '9' });

        const dialog = document.createElement('div');

        dialog.setAttribute('role', 'dialog');
        document.body.append(dialog);
        fireEvent.keyDown(document.body, { key: '1' });
        dialog.remove();

        rerender(<Host list={null} play={play} />);
        fireEvent.keyDown(document.body, { key: '1' });

        expect(play).not.toHaveBeenCalled();
    });
});
