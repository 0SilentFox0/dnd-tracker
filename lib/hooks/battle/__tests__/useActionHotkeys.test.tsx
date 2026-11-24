// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useActionHotkeys } from '@/lib/hooks/battle/useActionHotkeys';

const setup = (enabled = true, disabledFirst = false) => {
    const runs = [vi.fn(), vi.fn()];

    const close = vi.fn();

    const Host = () => {
        useActionHotkeys({
            enabled,
            close,
            items: runs.map((run, i) => ({
                key: `k${i}`,
                run,
                disabled: disabledFirst && i === 0,
            })),
        });

        return <input data-testid="field" />;
    };

    const view = render(<Host />);

    return { runs, close, view };
};

describe('useActionHotkeys', () => {
    afterEach(cleanup);

    it('digit runs the nth item', () => {
        const { runs } = setup();

        fireEvent.keyDown(document.body, { key: '2' });

        expect(runs[1]).toHaveBeenCalledTimes(1);
        expect(runs[0]).not.toHaveBeenCalled();
    });

    it('skips disabled items', () => {
        const { runs } = setup(true, true);

        fireEvent.keyDown(document.body, { key: '1' });

        expect(runs[0]).not.toHaveBeenCalled();
    });

    it('ignores typing in an input', () => {
        const { runs, view } = setup();

        fireEvent.keyDown(view.getByTestId('field'), { key: '1' });

        expect(runs[0]).not.toHaveBeenCalled();
    });

    it('ignores modifiers and repeats', () => {
        const { runs } = setup();

        fireEvent.keyDown(document.body, { key: '1', ctrlKey: true });
        fireEvent.keyDown(document.body, { key: '1', repeat: true });

        expect(runs[0]).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
        const { runs, close } = setup(false);

        fireEvent.keyDown(document.body, { key: '1' });
        fireEvent.keyDown(document.body, { key: 'q' });

        expect(runs[0]).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
    });

    it('Q only closes', () => {
        const { runs, close } = setup();

        fireEvent.keyDown(document.body, { key: 'q' });

        expect(close).toHaveBeenCalledTimes(1);
        expect(runs[0]).not.toHaveBeenCalled();
    });

    it('cleanup removes the listener', () => {
        const { runs, view } = setup();

        view.unmount();
        fireEvent.keyDown(document.body, { key: '1' });

        expect(runs[0]).not.toHaveBeenCalled();
    });
});
