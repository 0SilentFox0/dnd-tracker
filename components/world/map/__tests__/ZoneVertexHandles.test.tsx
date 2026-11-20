// @vitest-environment happy-dom
import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ZoneVertexHandles } from '../ZoneVertexHandles';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { Polygon } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const polygon: Polygon = [
    [0.2, 0.2],
    [0.6, 0.2],
    [0.4, 0.6],
    [0.2, 0.2],
];

function setup() {
    const onChange = vi.fn();

    const onPreview = vi.fn();

    render(
        <ZoneVertexHandles
            markerId="z"
            polygon={polygon}
            zoom={1}
            pointAt={(x, y) => ({ x, y })}
            onPreview={onPreview}
            onChange={onChange}
        />
    );

    return {
        onChange,
        onPreview,
        handle: () =>
            document.querySelector('[data-vertex="1"]') as HTMLElement,
    };
}

describe('ZoneVertexHandles keyboard', () => {
    it('is focusable and describes the keys', () => {
        const { handle } = setup();

        expect(handle().tagName).toBe('BUTTON');
        expect(handle().getAttribute('aria-description')).toBeTruthy();
    });

    it('nudges with arrows, larger with Shift, and commits once on Enter', () => {
        const { handle, onChange, onPreview } = setup();

        fireEvent.keyDown(handle(), { key: 'ArrowRight' });
        fireEvent.keyDown(handle(), { key: 'ArrowDown', shiftKey: true });

        expect(onChange).not.toHaveBeenCalled();
        expect(onPreview).toHaveBeenCalled();

        fireEvent.keyDown(handle(), { key: 'Enter' });

        expect(onChange).toHaveBeenCalledTimes(1);

        const ring = onChange.mock.calls[0][1] as Polygon;

        expect(ring[1][0]).toBeCloseTo(0.602);
        expect(ring[1][1]).toBeCloseTo(0.21);
        expect(ring[0]).toEqual(ring[ring.length - 1]);
        expect(onPreview).toHaveBeenLastCalledWith(null);
    });

    it('discards the change on Escape', () => {
        const { handle, onChange, onPreview } = setup();

        fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
        fireEvent.keyDown(handle(), { key: 'Escape' });

        expect(onChange).not.toHaveBeenCalled();
        expect(onPreview).toHaveBeenLastCalledWith(null);
    });

    it('commits a pending nudge when focus leaves', () => {
        const { handle, onChange } = setup();

        fireEvent.keyDown(handle(), { key: 'ArrowUp' });
        fireEvent.blur(handle());

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('does nothing for other keys', () => {
        const { handle, onChange, onPreview } = setup();

        fireEvent.keyDown(handle(), { key: 'a' });
        fireEvent.blur(handle());

        expect(onPreview).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });
});
