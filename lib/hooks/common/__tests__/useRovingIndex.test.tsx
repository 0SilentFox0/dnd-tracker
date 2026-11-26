// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useRovingIndex } from '@/lib/hooks/common';

function Grid({ cols, loop }: { cols?: number; loop?: boolean }) {
    const [active, setActive] = useState(0);

    const roving = useRovingIndex({
        count: 6,
        active,
        cols,
        loop,
        onMove: setActive,
    });

    return (
        <div role="toolbar" aria-label="g" onKeyDown={roving.onKeyDown}>
            {Array.from({ length: 6 }, (_, i) => (
                <button
                    key={i}
                    ref={roving.itemRef(i)}
                    tabIndex={roving.tabIndex(i)}
                    data-testid={`i${i}`}
                >
                    {i}
                </button>
            ))}
        </div>
    );
}

const press = (key: string) =>
    fireEvent.keyDown(screen.getByRole('toolbar'), { key });

afterEach(cleanup);

describe('useRovingIndex', () => {
    it('moves with the horizontal arrows and focuses the item', () => {
        render(<Grid />);
        press('ArrowRight');
        expect(screen.getByTestId('i1')).toHaveFocus();
        expect(screen.getByTestId('i1').tabIndex).toBe(0);
        expect(screen.getByTestId('i0').tabIndex).toBe(-1);
        press('ArrowLeft');
        expect(screen.getByTestId('i0')).toHaveFocus();
    });

    it('moves by cols with the vertical arrows', () => {
        render(<Grid cols={3} />);
        press('ArrowDown');
        expect(screen.getByTestId('i3')).toHaveFocus();
        press('ArrowUp');
        expect(screen.getByTestId('i0')).toHaveFocus();
    });

    it('steps by one with the vertical arrows when cols is 1', () => {
        render(<Grid />);
        press('ArrowDown');
        expect(screen.getByTestId('i1')).toHaveFocus();
    });

    it('jumps with Home and End', () => {
        render(<Grid />);
        press('End');
        expect(screen.getByTestId('i5')).toHaveFocus();
        press('Home');
        expect(screen.getByTestId('i0')).toHaveFocus();
    });

    it('stops at the edges without loop and wraps with it', () => {
        const first = render(<Grid />);

        press('ArrowLeft');
        expect(screen.getByTestId('i0').tabIndex).toBe(0);
        first.unmount();

        render(<Grid loop />);
        press('ArrowLeft');
        expect(screen.getByTestId('i5')).toHaveFocus();
    });
});
