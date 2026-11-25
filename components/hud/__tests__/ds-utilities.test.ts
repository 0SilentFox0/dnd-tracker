import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { HUD_PRELOAD_FONTS } from '@/components/hud/fonts';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const hud = read('components/hud/hud.css');

const globals = read('app/globals.css');

describe('DS utilities', () => {
    it('defines the panel, inset, raised and ornament utilities', () => {
        for (const selector of [
            '.ds-panel',
            '.ds-inset',
            '.ds-raised',
            '.ornate::after',
            '.orn {',
        ]) {
            expect(hud).toContain(selector);
        }
    });

    it('drops the old background picture and dead effects', () => {
        for (const removed of [
            'vey-strait',
            'glass-card',
            'neon-border',
            'pulse-glow',
        ]) {
            expect(globals).not.toContain(removed);
        }
    });

    it('sets the global focus ring and scroll padding', () => {
        expect(globals).toMatch(/:focus-visible\s*\{[^}]*var\(--focus\)/);
        expect(globals).toContain('scroll-padding-top: 72px');
    });

    it('preloads Cormorant for the first paint', () => {
        expect(
            HUD_PRELOAD_FONTS.some((href) => href.includes('Cormorant'))
        ).toBe(true);
    });
});
