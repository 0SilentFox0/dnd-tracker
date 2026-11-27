import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('page shell css', () => {
    it('parchment body::after has sepia filter', () => {
        const css = read('app/globals.css');

        const block = css.match(
            /html\[data-palette="parchment"\] body::after \{[^}]*\}/
        )?.[0];

        expect(block).toContain('sepia(');
        expect(block).toContain('mix-blend-mode: multiply');
    });

    it('both palettes and auth pages share the map background', () => {
        const css = read('app/globals.css');

        expect(css).toContain('html[data-palette] body::after');
        expect(css).toContain('body:has(.auth-legacy)::after');
    });

    it('ds-skeleton static under reduced motion', () => {
        const css = read('components/hud/hud.css');

        const reduced = css.match(
            /@media \(prefers-reduced-motion: reduce\) \{ \.ds-skeleton \{[^}]*\} \}/
        )?.[0];

        expect(css).toContain('--skeleton-hi');
        expect(reduced).toContain('animation: none');
    });

    it('scenario page sheet no longer fills the whole page', () => {
        const css = read('components/scenario/book/scenario-book.css');

        expect(css).toMatch(/\.scenario-book--page \{ background: transparent/);
    });
});
