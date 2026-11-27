// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HudButton } from '@/components/hud/HudButton';
import { Button } from '@/components/ui/button';
import { DISABLED_CLASS } from '@/components/ui/disabled';
import { FIELD_CLASS } from '@/components/ui/field-class';

describe('DISABLED_CLASS', () => {
    it('has opacity-50 and cursor-not-allowed', () => {
        expect(DISABLED_CLASS).toContain('disabled:opacity-50');
        expect(DISABLED_CLASS).toContain('disabled:cursor-not-allowed');
    });

    it('never blocks pointer events', () => {
        expect(DISABLED_CLASS).not.toContain('pointer-events-none');
    });

    it('is shared by fields and HudButton', () => {
        expect(FIELD_CLASS).toContain(DISABLED_CLASS);
        render(<HudButton disabled>Go</HudButton>);
        expect(screen.getByText('Go').className).toContain(DISABLED_CLASS);
    });

    it('Button disabled has no pointer-events-none', () => {
        render(<Button disabled>Plain</Button>);

        const { className } = screen.getByText('Plain');

        expect(className).toContain(DISABLED_CLASS);
        expect(className).not.toMatch(/disabled:pointer-events-none/);
    });
});
