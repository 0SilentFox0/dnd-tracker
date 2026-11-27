// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { Swords } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HeaderPillLink } from '@/components/campaigns/HeaderPillLink';
import { HUD_CHIP_CLASS } from '@/components/hud/page/chip-class';
import { buttonVariants } from '@/components/ui/button';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: Record<string, unknown>) => (
        <a href={href as string} {...rest}>
            {children as never}
        </a>
    ),
}));

afterEach(cleanup);

describe('Button sizes', () => {
    it('Button sizes are 32/40/48', () => {
        expect(buttonVariants({ size: 'sm' })).toContain('h-8');
        expect(buttonVariants({ size: 'default' })).toContain('h-10');
        expect(buttonVariants({ size: 'lg' })).toContain('h-12');
        expect(buttonVariants({ size: 'lg' })).not.toContain('52px');
    });

    it('icon sizes are square 32/40/48', () => {
        expect(buttonVariants({ size: 'icon-sm' })).toContain('size-8');
        expect(buttonVariants({ size: 'icon' })).toContain('size-10');
        expect(buttonVariants({ size: 'icon-lg' })).toContain('size-12');
    });

    it('coarse pointer adds min-h-11', () => {
        expect(buttonVariants({})).toContain('pointer-coarse:min-h-11');
        expect(buttonVariants({ size: 'icon' })).toContain(
            'pointer-coarse:min-w-11'
        );
    });

    it('secondary variant removed', () => {
        expect(
            buttonVariants({ variant: 'secondary' } as never)
        ).not.toContain('secondary');
    });

    it('chip class height 32', () => {
        expect(HUD_CHIP_CLASS).toContain('h-8');
        expect(HUD_CHIP_CLASS).toContain('rounded-lg');
    });

    it('HeaderPillLink is icon-only below sm, label stays for screen readers', () => {
        render(
            <HeaderPillLink
                href="/x"
                icon={Swords}
                label="GO"
                srLabel="Go there"
            />
        );

        expect(screen.getByText('GO').className).toContain('max-sm:sr-only');
        expect(screen.getByLabelText('Go there')).toBeTruthy();
    });
});
