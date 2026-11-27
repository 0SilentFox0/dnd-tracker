import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { collectUiScale, countUiScale } from './helpers/ui-scale';

vi.setConfig({ testTimeout: 30_000 });

const exempt: Record<string, number> = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, '../../ratchets/ui-scale-exempt.json'),
        'utf8'
    )
);

const T = (...parts: string[]) => parts.join('');

describe('ui-scale ratchet', () => {
    const found = collectUiScale();

    it('no file exceeds its exempt count and no new file appears', () => {
        const bad = Object.entries(found).filter(
            ([file, n]) => n > (exempt[file] ?? 0)
        );

        expect(bad).toEqual([]);
    });

    it('exempt entries are exact (shrink or remove them)', () => {
        const stale = Object.entries(exempt).filter(
            ([file, n]) => found[file] !== n
        );

        expect(stale).toEqual([]);
    });

    it.each([
        [T('text-[', '11px]'), 1],
        [T('text-[', '0.65rem] text-[', '13.5px]'), 2],
        [T('text-[', 'clamp(1rem,2vw,3rem)]'), 1],
    ])('counts font-arbitrary in %s', (text, n) =>
        expect(countUiScale(text)['font-arbitrary']).toBe(n)
    );

    it.each([
        T('text-[', '12px]'),
        T('text-[', '40px] text-[', '22px]'),
        'text-[var(--ink)]',
    ])('allows on-scale arbitrary %s', (text) =>
        expect(countUiScale(text)['font-arbitrary']).toBe(0)
    );

    it('allows dynamic font sizes in the landing', () => {
        expect(
            countUiScale(
                T('text-[', 'clamp(2rem,5vw,4rem)]'),
                'components/landing/Hero.tsx'
            )['font-arbitrary']
        ).toBe(0);
    });

    it.each([
        [T('rounded-', 'md'), 1],
        [T('sm:rounded-t-', '2xl'), 1],
        [T('rounded-[', '3px]'), 1],
        [T('className="', 'rounded', ' p-1"'), 1],
    ])('counts radius-arbitrary and off-scale %s', (text, n) =>
        expect(countUiScale(text)['radius-arbitrary']).toBe(n)
    );

    it.each([
        'rounded-lg rounded-sm rounded-xl rounded-full',
        T('rounded-[', 'inherit]'),
        T('rounded-[', 'var(--r-md)]'),
    ])('allows %s', (text) =>
        expect(countUiScale(text)['radius-arbitrary']).toBe(0)
    );

    it('counts Button height override', () => {
        expect(
            countUiScale(`<Button className="min-h-11 sm:h-9" size="sm">`)[
                'button-height'
            ]
        ).toBe(2);
        expect(
            countUiScale(`<Button className="[&_svg]:size-4 w-full">`)[
                'button-height'
            ]
        ).toBe(0);
    });

    it('allows HudButton h-10 but not h-9', () => {
        expect(
            countUiScale(`<HudButton className="h-10 w-full">`)['button-height']
        ).toBe(0);
        expect(
            countUiScale(`<HudButton className="h-9 h-[30px]">`)[
                'button-height'
            ]
        ).toBe(2);
    });

    it('counts off-ladder heights in button class constants', () => {
        expect(
            countUiScale(
                `const ICON_BTN = 'size-7 h-[30px] h-10 pointer-coarse:min-h-11'`
            )['button-height']
        ).toBe(2);
        expect(
            countUiScale(`const PANEL = 'h-7 size-7'`)['button-height']
        ).toBe(0);
    });

    it('counts disabled:opacity-40 but not 50', () => {
        expect(
            countUiScale(T('disabled:opacity-', '40'))['disabled-opacity']
        ).toBe(1);
        expect(
            countUiScale(T('disabled:opacity-', '50'))['disabled-opacity']
        ).toBe(0);
    });

    it('counts css font-size 11px and .7rem but not 12px', () => {
        const css = (v: string) =>
            countUiScale(`.a { ${T('font-', 'size')}: ${v}; }`, 'a.css')[
                'css-small-font'
            ];

        expect(css('11px')).toBe(1);
        expect(css('.7rem')).toBe(1);
        expect(css('12px')).toBe(0);
        expect(css('0.75rem')).toBe(0);
    });
});
