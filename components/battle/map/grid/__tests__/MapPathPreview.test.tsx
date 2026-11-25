// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const touch = vi.hoisted(() => ({ value: false }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useCoarsePointer: () => touch.value,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, v: Record<string, number>) =>
        `${key}:${v.metres}:${v.feet}`,
}));

import { MapPathPreview } from '../MapPathPreview';

import { cellCenter } from '@/lib/utils/battle/grid';
import type { PathPreview } from '@/types/battle-grid';

const preview: PathPreview = {
    from: { x: 0, y: 0 },
    path: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
    ],
    cost: 2,
    feet: 10,
    metres: 3,
};

const renderPreview = (p: PathPreview | null) =>
    render(
        <svg>
            <MapPathPreview grid="square" preview={p} />
        </svg>
    );

describe('MapPathPreview', () => {
    it('draws the polyline through the path and the cost label', () => {
        touch.value = false;

        const { container } = renderPreview(preview);

        const pts = [preview.from, ...preview.path]
            .map((c) => cellCenter(c))
            .map((c) => `${c.x},${c.y}`)
            .join(' ');

        expect(
            container.querySelector('polyline')?.getAttribute('points')
        ).toBe(pts);
        expect(container.querySelector('[data-path-cost]')?.textContent).toBe(
            'pathCost:3:10'
        );
    });

    it('renders nothing without a path', () => {
        touch.value = false;

        expect(
            renderPreview(null).container.querySelector('[data-path-preview]')
        ).toBeNull();
    });

    it('renders nothing on a coarse pointer', () => {
        touch.value = true;

        expect(
            renderPreview(preview).container.querySelector(
                '[data-path-preview]'
            )
        ).toBeNull();
    });
});
