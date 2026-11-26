// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { HudChipTabs } from '@/components/hud/page/HudChipTabs';
import { Button, buttonVariants } from '@/components/ui/button';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: Record<string, unknown>) => (
        <a href={href as string} {...rest}>
            {children as never}
        </a>
    ),
}));

describe('button DS', () => {
    it('keeps data-variant and data-size', () => {
        render(
            <Button variant="outline" size="sm">
                Go
            </Button>
        );

        const b = screen.getByRole('button');

        expect(b.getAttribute('data-variant')).toBe('outline');
        expect(b.getAttribute('data-size')).toBe('sm');
    });

    it('every variant carries a hover class', () => {
        for (const variant of [
            'default',
            'outline',
            'secondary',
            'destructive',
            'ghost',
            'link',
        ] as const) {
            expect(buttonVariants({ variant })).toMatch(/hover:/);
        }
    });

    it('HudChipTabs marks only the active link as current page', () => {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

        render(
            <HudChipTabs
                ariaLabel="tabs"
                items={[
                    { key: 'a', label: 'A', href: '/a', active: true },
                    { key: 'b', label: 'B', href: '/b', active: false },
                ]}
            />
        );

        expect(screen.getByText('A').getAttribute('aria-current')).toBe('page');
        expect(screen.getByText('B').getAttribute('aria-current')).toBeNull();
    });

    it('keeps the hud link rules inside @layer base so utilities win', () => {
        const css = readFileSync(
            join(process.cwd(), 'app/globals.css'),
            'utf8'
        );

        const rule = css.indexOf('.hud-surface a[href]:hover');

        expect(rule).toBeGreaterThan(css.indexOf('@layer base {'));
        expect(css.lastIndexOf('@layer base {', rule)).toBeGreaterThan(-1);
        expect(
            css.slice(css.lastIndexOf('@layer base {', rule), rule)
        ).not.toMatch(/\n}\n/);
    });
});
