// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GridStatic } from '../GridStatic';

import type { BattleMapConfig } from '@/types/battle-grid';

afterEach(cleanup);

const map = (terrain: BattleMapConfig['terrain']): BattleMapConfig => ({
    cols: 6,
    rows: 6,
    background: null,
    opacity: 0.3,
    terrain,
});

const renderStatic = (
    terrain: BattleMapConfig['terrain'],
    props: { blocked?: Set<string>; showBlocked?: boolean; rotated?: boolean } = {}
) =>
    render(
        <svg>
            <GridStatic
                map={map(terrain)}
                blocked={props.blocked ?? new Set()}
                window={null}
                rotated={props.rotated ?? false}
                showBlocked={props.showBlocked}
            />
        </svg>
    );

describe('GridStatic', () => {
    it('draws nothing without terrain', () => {
        const { container } = renderStatic(undefined);

        expect(container.querySelector('[data-terrain]')).toBeNull();
        expect(container.querySelector('[data-hazard-layer]')).toBeNull();
    });

    it('merges each terrain kind into a single path', () => {
        const { container } = renderStatic({
            '0:0': { kind: 'wall' },
            '1:0': { kind: 'wall' },
            '3:3': { kind: 'barrier' },
        });

        expect(container.querySelectorAll('[data-terrain="wall"] path')).toHaveLength(1);
        expect(container.querySelectorAll('[data-terrain="barrier"] path')).toHaveLength(2);
    });

    it('renders a flame per hazard cell, upright on a rotated map', () => {
        const { container } = renderStatic(
            {
                '1:1': { kind: 'hazard' },
                '2:2': { kind: 'hazard' },
            },
            { rotated: true }
        );

        const flames = container.querySelectorAll('[data-hazard-flame]');

        expect(flames).toHaveLength(2);
        expect(flames[0].getAttribute('transform')).toContain('rotate(-90');
    });

    it('skips terrain under blocked cells and tints blocked ones only on request', () => {
        const blocked = new Set(['0:0']);

        const hidden = renderStatic({ '0:0': { kind: 'wall' } }, { blocked });

        expect(hidden.container.querySelector('[data-terrain="wall"]')).toBeNull();
        expect(hidden.container.querySelector('[data-blocked]')).toBeNull();

        cleanup();

        const shown = renderStatic(undefined, { blocked, showBlocked: true });

        expect(shown.container.querySelector('[data-blocked]')).not.toBeNull();
    });

    it('marks difficult and obscured cells with their own overlay', () => {
        const { container } = renderStatic({
            '1:1': { kind: 'difficult' },
            '2:2': { kind: 'hazard', obscured: true },
        });

        expect(container.querySelector('[data-difficult]')).not.toBeNull();
        expect(container.querySelector('[data-obscured]')).not.toBeNull();
    });
});
