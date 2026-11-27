import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { HUD_PRELOAD_FONTS } from '@/components/hud/fonts';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const globals = read('app/globals.css');

const fontsCss = read('app/fonts.css');

const hud = read('components/hud/hud.css');

const SCALE: Record<string, [string, string]> = {
    xs: ['0.75rem', '1rem'],
    sm: ['0.875rem', '1.25rem'],
    base: ['1rem', '1.5rem'],
    lg: ['1.125rem', '1.625rem'],
    xl: ['1.375rem', '1.75rem'],
    '2xl': ['1.75rem', '2.125rem'],
    '3xl': ['2.5rem', '2.875rem'],
};

describe('typography', () => {
    it('theme text scale equals 12/14/16/18/22/28/40', () => {
        for (const [step, [size, lineHeight]] of Object.entries(SCALE)) {
            expect(globals).toContain(`--text-${step}: ${size};`);
            expect(globals).toContain(
                `--text-${step}--line-height: ${lineHeight};`
            );
        }
    });

    it('fonts.css declares only Alegreya, Cormorant SC, Oswald', () => {
        const families = new Set(
            [...fontsCss.matchAll(/font-family: "([^"]+)"; src/g)].map(
                (m) => m[1]
            )
        );

        expect([...families].sort()).toEqual([
            'Alegreya',
            'Cormorant SC',
            'Oswald',
        ]);
    });

    it('no removed font file is referenced', () => {
        const removed =
            /Geist|EBGaramond|EB Garamond|AlegreyaSans|Alegreya Sans|AlegreyaSC|Alegreya SC/;

        for (const file of [
            'app/fonts.css',
            'app/globals.css',
            'app/layout.tsx',
            'components/hud/fonts.ts',
            'components/landing/landing.css',
            'components/world/world-atlas.css',
            'components/scenario/book/scenario-book.css',
        ]) {
            expect(read(file), file).not.toMatch(removed);
        }

        const files = readdirSync(join(process.cwd(), 'public/fonts'));

        expect(files.filter((f) => removed.test(f))).toEqual([]);
    });

    it('every font file referenced by fonts.css exists', () => {
        for (const m of fontsCss.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)) {
            expect(existsSync(join(process.cwd(), 'public', m[1])), m[1]).toBe(
                true
            );
        }
    });

    it('preload list has no AlegreyaSC', () => {
        expect(HUD_PRELOAD_FONTS.some((f) => f.includes('AlegreyaSC'))).toBe(
            false
        );
        expect(HUD_PRELOAD_FONTS).toContain('/fonts/Alegreya-Variable.woff2');
    });

    it('hud-sc with text-xs falls back to body font', () => {
        const rule = hud.match(
            /\.hud-sc\.text-xs,\s*\.hud-title\.text-xs\s*\{([^}]*)\}/
        );

        expect(rule?.[1]).toContain('font-family: var(--font-body)');
        expect(rule?.[1]).toContain('font-weight: 600');
    });

    it('hud-label is a 12px uppercase Alegreya label', () => {
        const rule = hud.match(/\.hud-label\s*\{([^}]*)\}/)?.[1] ?? '';

        expect(rule).toContain('var(--text-xs)');
        expect(rule).toContain('text-transform: uppercase');
        expect(rule).toContain('font-weight: 600');
    });

    it('landing and world atlas use Cormorant SC, not a remap', () => {
        expect(read('components/landing/landing.css')).not.toMatch(
            /--font-hud-(sc|sans):/
        );
        expect(read('components/world/world-atlas.css')).toContain(
            'font-family: "Cormorant SC"'
        );
    });

    it('scenario and book fonts point to Alegreya', () => {
        expect(fontsCss).toMatch(/--font-hud-book: "Alegreya"/);
        expect(fontsCss).toMatch(/--font-scenario-sans: "Alegreya"/);
    });
});
