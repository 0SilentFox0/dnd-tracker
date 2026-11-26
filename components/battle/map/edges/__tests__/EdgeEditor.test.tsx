// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EdgeEditor } from '../EdgeEditor';

import type { EdgeEditing } from '@/lib/hooks/battle';
import { edgeSegment } from '@/lib/utils/battle/grid/edge-keys';

afterEach(cleanup);

const renderEditor = (editing: Partial<EdgeEditing> = {}) =>
    render(
        <svg data-fx-grid="">
            <EdgeEditor
                map={{ cols: 4, rows: 3 }}
                editing={{
                    existing: new Set(),
                    onCommit: vi.fn(),
                    ...editing,
                }}
            />
        </svg>
    );

describe('EdgeEditor', () => {
    it('is one transparent surface covering the whole map', () => {
        const { container } = renderEditor();

        const surface = container.querySelector('[data-edge-surface]');

        expect(surface?.getAttribute('width')).toBe('400');
        expect(surface?.getAttribute('height')).toBe('300');
        expect(container.querySelectorAll('[data-edge-pending]')).toHaveLength(0);
    });

    it('draws edges that await the server as additions and removals', () => {
        const { container } = renderEditor({
            committed: {
                add: new Set(['1:1:e']),
                remove: new Set(['2:2:s']),
            },
        });

        const rects = container.querySelectorAll('[data-edge-committed]');

        expect(rects).toHaveLength(2);
        expect(
            container
                .querySelector('[data-edge-committed="1:1:e"]')
                ?.getAttribute('class')
        ).toBe('map-edge-pending');
        expect(
            container
                .querySelector('[data-edge-committed="2:2:s"]')
                ?.getAttribute('class')
        ).toBe('map-edge-pending-remove');
    });

    it('a stroke through the middle of two hex edges marks both as pending', () => {
        const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        const spy = vi
            .spyOn(SVGSVGElement.prototype, 'getScreenCTM')
            .mockReturnValue(identity as unknown as DOMMatrix);

        const mid = (edge: string) => {
            const [p, q] = edgeSegment('hex', edge);

            return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
        };

        const a = mid('2:2:ne');

        const b = mid('2:2:se');

        const { container } = render(
            <svg>
                <EdgeEditor
                    map={{ cols: 5, rows: 5, gridType: 'hex' }}
                    editing={{ existing: new Set(), onCommit: vi.fn() }}
                />
            </svg>
        );

        const surface = container.querySelector('[data-edge-surface]');

        if (!surface) throw new Error('no surface');

        const init = { pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse' };

        fireEvent.pointerDown(surface, { ...init, clientX: a.x, clientY: a.y });
        fireEvent.pointerMove(surface, { ...init, clientX: b.x, clientY: b.y });

        expect(container.querySelectorAll('[data-edge-pending]')).toHaveLength(2);
        spy.mockRestore();
    });
});
