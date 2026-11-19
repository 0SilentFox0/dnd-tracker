// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DoorsLayer } from '../DoorsLayer';

afterEach(cleanup);

const doors = {
    '1:1:e': { open: false, locked: true },
    '3:3:s': { open: true },
};

const renderLayer = (over: Partial<Parameters<typeof DoorsLayer>[0]> = {}) =>
    render(
        <svg>
            <DoorsLayer
                doors={doors}
                pxPerUnit={0.1}
                rotated={false}
                showLock={false}
                {...over}
            />
        </svg>
    );

describe('DoorsLayer', () => {
    it('ДМ бачить замок, гравець — ні', () => {
        expect(
            renderLayer({ showLock: true }).container.querySelector(
                '[data-door-lock]'
            )
        ).not.toBeNull();
        cleanup();
        expect(
            renderLayer().container.querySelector('[data-door-lock]')
        ).toBeNull();
    });

    it('відчинені позначені, виламані (відсутні) не малюються', () => {
        const { container } = renderLayer();

        expect(container.querySelectorAll('[data-map-door]')).toHaveLength(2);
        expect(
            container
                .querySelector('[data-map-door="3:3:s"]')
                ?.hasAttribute('data-door-open')
        ).toBe(true);
    });

    it('хітбокс не менший за 30px, клік віддає ребро й двері', () => {
        const onPress = vi.fn();

        const { container } = renderLayer({ onPress });

        const hit = container.querySelector('[data-door-hit="1:1:e"]');

        expect(Number(hit?.getAttribute('r')) * 0.1 * 2).toBeGreaterThanOrEqual(
            30
        );
        fireEvent.click(hit as Element);
        expect(onPress).toHaveBeenCalledWith('1:1:e', doors['1:1:e']);
    });

    it('без onPress хітбоксів нема', () => {
        expect(
            renderLayer().container.querySelector('[data-door-hit]')
        ).toBeNull();
    });
});
