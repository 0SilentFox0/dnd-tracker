import { describe, expect, it } from 'vitest';

import { rewriteGold } from '@/scripts/codemods/gold-to-ds';

const cls = (c: string) => `<div className="${c}" />`;

const run = (c: string) => rewriteGold(cls(c));

describe('rewriteGold', () => {
    it.each([
        ['border-hud-gold/40', 'border-hud-line'],
        ['border-hud-gold-strong/30', 'border-hud-line'],
        ['border-hud-gold-bright/20', 'border-hud-line'],
        ['border-[var(--gold)]/40', 'border-hud-line'],
        ['bg-hud-gold/10', 'bg-hud-panel-2'],
        ['bg-hud-gold-strong/15', 'bg-hud-panel-2'],
        ['bg-[var(--gold)]/10', 'bg-hud-panel-2'],
        ['text-hud-gold/70', 'text-hud-muted'],
        ['text-hud-gold-bright/80', 'text-hud-muted'],
        ['text-hud-gold-bright', 'text-hud-ink'],
        ['text-hud-gold-strong', 'text-hud-ink'],
        ['hover:text-hud-gold', 'hover:text-hud-ink'],
        ['hover:text-hud-gold-bright', 'hover:text-hud-ink'],
        ['hover:text-[var(--gold)]', 'hover:text-hud-ink'],
        ['hover:border-hud-gold', 'hover:border-hud-muted'],
        ['hover:border-hud-gold-strong/50', 'hover:border-hud-muted'],
        ['accent-hud-gold', 'accent-hud-crimson'],
        ['accent-[var(--gold)]', 'accent-hud-crimson'],
        ['decoration-hud-gold/50', 'decoration-hud-line'],
        ['decoration-hud-gold-strong', 'decoration-hud-line'],
        ['hover:bg-hud-gold/20', 'hover:bg-hud-panel-2'],
        ['group-hover:text-hud-gold-strong', 'group-hover:text-hud-ink'],
        [
            'data-[state=open]:border-hud-gold/60',
            'data-[state=open]:border-hud-line',
        ],
        ['aria-checked:bg-hud-gold/20', 'aria-checked:bg-hud-panel-2'],
        ['after:bg-hud-gold/30', 'after:bg-hud-panel-2'],
    ])('%s -> %s', (input, output) => {
        const r = run(`p-2 ${input} flex`);

        expect(r.text).toBe(cls(`p-2 ${output} flex`));
        expect(r.ambiguous).toBe(0);
    });

    it.each([
        ['ring-hud-gold'],
        ['ring-hud-gold/40'],
        ['outline-hud-gold-strong'],
        ['focus-visible:ring-hud-gold'],
        ['focus-visible:outline-[var(--gold)]'],
        ['shadow-[0_0_12px_var(--color-hud-glow)]'],
        ['shadow-[inset_0_0_0_1px_var(--color-hud-glow)]'],
    ])('removes %s', (token) => {
        expect(run(`a ${token} b`).text).toBe(cls('a b'));
        expect(run(`${token} b`).text).toBe(cls('b'));
        expect(run(`a ${token}`).text).toBe(cls('a'));
    });

    it.each([
        ['text-hud-gold'],
        ['border-hud-gold'],
        ['border-hud-gold-strong'],
        ['bg-hud-gold'],
        ['bg-hud-gold-strong'],
        ['text-[var(--gold)]'],
        ['border-[var(--gold)]'],
        ['bg-[var(--gold)]'],
        ['focus-visible:text-hud-gold'],
    ])('keeps ambiguous %s and counts it', (token) => {
        const r = run(`a ${token} b`);

        expect(r.text).toBe(cls(`a ${token} b`));
        expect(r.ambiguous).toBe(1);
    });

    it('leaves css var references alone', () => {
        const src = '.x { color: var(--hud-gold); }';

        expect(rewriteGold(src)).toEqual({ text: src, ambiguous: 0 });
    });

    it('merges duplicate classes on a changed line', () => {
        expect(run('border-hud-line border-hud-gold/40 p-1').text).toBe(
            cls('border-hud-line p-1')
        );
    });

    it('does not match longer class names', () => {
        const src = cls('text-hud-gold-dim border-hud-goldish');

        expect(rewriteGold(src).text).toBe(src);
    });

    it('is idempotent', () => {
        const src = cls(
            'a border-hud-gold/40 ring-hud-gold text-hud-gold hover:text-hud-gold'
        );

        const once = rewriteGold(src);

        expect(rewriteGold(once.text).text).toBe(once.text);
        expect(rewriteGold(once.text).ambiguous).toBe(once.ambiguous);
    });
});
