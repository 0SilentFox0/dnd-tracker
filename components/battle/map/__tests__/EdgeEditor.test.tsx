// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EdgeEditor } from '../EdgeEditor';

import type { EdgeEditing } from '@/lib/hooks/battle';

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
});
