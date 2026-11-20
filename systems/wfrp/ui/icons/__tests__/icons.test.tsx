// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import { WFRP_UI_ICON_MAP } from '@/systems/wfrp/ui';
import { WFRP_UI_ICONS, wfrpIcon } from '@/systems/wfrp/ui/icons';

const keysOf = (group: keyof typeof WFRP_UI_ICONS) =>
    Object.keys(WFRP_UI_ICONS[group]);

describe('wfrp ui icons', () => {
    afterEach(cleanup);

    it('covers exactly the keys listed by inventory.ts --ui', () => {
        const out = execFileSync(
            'pnpm',
            [
                'exec',
                'tsx',
                '--tsconfig',
                'tsconfig.scripts.json',
                'scripts/assets/grim-icons/inventory.ts',
                '--ui',
                '--json',
            ],
            { encoding: 'utf8' }
        );

        const expected = JSON.parse(out.slice(out.indexOf('{'))) as Record<
            string,
            string[]
        >;

        const actual = Object.fromEntries(
            (Object.keys(WFRP_UI_ICONS) as (keyof typeof WFRP_UI_ICONS)[]).map(
                (g) => [g, keysOf(g).sort()]
            )
        );

        expect(actual).toEqual(
            Object.fromEntries(
                Object.entries(expected).map(([g, k]) => [g, [...k].sort()])
            )
        );

        expect(Object.values(actual).flat()).toHaveLength(48);
    }, 60_000);

    it('has unique keys across groups so the flat ui: map is lossless', () => {
        const all = (
            Object.keys(WFRP_UI_ICONS) as (keyof typeof WFRP_UI_ICONS)[]
        ).flatMap(keysOf);

        expect(Object.keys(WFRP_UI_ICON_MAP)).toHaveLength(all.length);
    });

    it('renders every icon as a 24-box currentColor svg without text', () => {
        for (const group of Object.keys(
            WFRP_UI_ICONS
        ) as (keyof typeof WFRP_UI_ICONS)[]) {
            for (const key of keysOf(group)) {
                const Icon = wfrpIcon(group, key)!;

                const { container, unmount } = render(<Icon />);

                const svg = container.querySelector('svg')!;

                expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
                expect(svg.textContent).toBe('');
                expect(svg.innerHTML).not.toBe('');

                unmount();
            }
        }
    });
});
