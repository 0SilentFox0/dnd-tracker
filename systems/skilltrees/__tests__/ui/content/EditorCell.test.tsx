// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorCell } from '@/systems/skilltrees/ui/content/skill-tree/editor/EditorCell';

describe('EditorCell', () => {
    afterEach(cleanup);

    it('an empty cell is an add button that fires onClick', () => {
        const onClick = vi.fn();

        render(
            <EditorCell
                label="Outer 1"
                skill={null}
                metal="m"
                error={false}
                onClick={onClick}
            />
        );

        const cell = screen.getByRole('button', { name: 'Outer 1' });

        expect(cell.className).toContain('empty');
        expect(cell.textContent).toBe('+');

        fireEvent.click(cell);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('a filled cell without an icon shows the skill name and its first letter', () => {
        render(
            <EditorCell
                label="Outer 1"
                skill={{ name: 'Slash', icon: null }}
                metal="metal-gold"
                error={false}
                onClick={vi.fn()}
            />
        );

        const cell = screen.getByRole('button', { name: 'Outer 1' });

        expect(cell.className).not.toContain('empty');
        expect(cell.textContent).toBe('SSlash');
        expect(cell.querySelector('.editor-icon')?.className).toContain(
            'metal-gold'
        );
    });

    it('marks errors and is disabled without a handler', () => {
        render(<EditorCell label="Locked" skill={null} metal="m" error />);

        const cell = screen.getByRole('button', { name: 'Locked' });

        expect(cell.className).toContain('error');
        expect(cell).toBeDisabled();
    });
});
