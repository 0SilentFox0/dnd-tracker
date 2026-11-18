// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HudIconButton } from '@/components/hud/HudButton';

describe('HudIconButton', () => {
    afterEach(cleanup);

    it('is a non-submitting button by default and fires onClick', () => {
        const onClick = vi.fn();

        render(
            <HudIconButton aria-label="x" onClick={onClick}>
                i
            </HudIconButton>
        );

        const btn = screen.getByLabelText('x');

        fireEvent.click(btn);
        expect(btn.getAttribute('type')).toBe('button');
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('size and tone change the rendered classes', () => {
        render(
            <>
                <HudIconButton aria-label="sm">a</HudIconButton>
                <HudIconButton aria-label="md" size="md" tone="danger">
                    b
                </HudIconButton>
            </>
        );

        const sm = screen.getByLabelText('sm');

        const md = screen.getByLabelText('md');

        expect(sm.className).toContain('size-8');
        expect(md.className).toContain('size-10');
        expect(md.className).toContain('text-hud-danger');
        expect(sm.className).not.toContain('text-hud-danger');
    });

    it('does not fire when disabled', () => {
        const onClick = vi.fn();

        render(
            <HudIconButton aria-label="d" disabled onClick={onClick}>
                i
            </HudIconButton>
        );
        fireEvent.click(screen.getByLabelText('d'));
        expect(onClick).not.toHaveBeenCalled();
    });
});
