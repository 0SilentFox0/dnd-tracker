// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const spy = vi.hoisted(() => ({ fill: vi.fn() }));

vi.mock('@/lib/utils/battle/grid', async (orig) => {
    const mod = await orig<typeof import('@/lib/utils/battle/grid')>();

    return {
        ...mod,
        regionFillPath: (keys: string[]) => {
            spy.fill(keys);

            return mod.regionFillPath(keys);
        },
    };
});

import { GridMarks } from '../grid/GridMarks';

import type { BattleMapConfig } from '@/types/battle-grid';

const map = { cols: 6, rows: 6, opacity: 0.3 } as BattleMapConfig;

const blocked = new Set(['0:0', '1:0']);

const renderMarks = (marks: Map<string, string>) => (
    <svg>
        <GridMarks
            map={map}
            blocked={blocked}
            marks={marks as never}
            maskId="m"
        />
    </svg>
);

describe('GridMarks line mask', () => {
    it('does not rebuild the static mask when only sparse marks change', () => {
        const { rerender, container } = render(
            renderMarks(new Map([['2:2', 'target']]))
        );

        const calls = spy.fill.mock.calls.length;

        rerender(renderMarks(new Map([['3:3', 'target']])));
        rerender(renderMarks(new Map([['4:4', 'pick']])));

        expect(spy.fill.mock.calls.length).toBe(calls);
        expect(container.querySelector('mask path')).not.toBeNull();
    });

    it('adds move zones to the mask on top of the static part', () => {
        const { container } = render(renderMarks(new Map([['2:2', 'move']])));

        const d = container.querySelector('mask path')?.getAttribute('d');

        expect(d).toContain(
            container
                .querySelector('[data-zone-fill="move"]')!
                .getAttribute('d')!
        );
    });
});
