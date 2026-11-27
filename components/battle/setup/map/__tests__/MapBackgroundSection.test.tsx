// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapBackgroundSection } from '@/components/battle/setup/map/shared/MapBackgroundSection';
import { useBattleMapEditor } from '@/lib/hooks/battles/setup/useBattleMapEditor';

vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: () => <div data-testid="upload" />,
}));
vi.mock('@/components/battle/setup/map/shared/GridCalibration', () => ({
    GridCalibration: () => <div data-testid="calibration" />,
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useImageSize: () => null,
}));

afterEach(cleanup);

function Harness() {
    return <MapBackgroundSection editor={useBattleMapEditor(null)} />;
}

describe('MapBackgroundSection', () => {
    it('renders sliders and the default background button in the original order', () => {
        const { container } = render(<Harness />);

        const ids = [
            'map-cell-size',
            'map-offset-x',
            'map-offset-y',
            'map-opacity',
        ].map((id) => {
            expect(container.querySelector(`#${id}`)).not.toBeNull();

            return id;
        });

        const order = Array.from(
            container.querySelectorAll<HTMLElement>(
                '#map-cell-size, #map-offset-x, #map-offset-y, #map-opacity'
            )
        ).map((el) => el.id);

        expect(order).toEqual(ids);
        expect(
            screen.getByRole('button', {
                name: 'battleSetup.map.defaultBackground',
            })
        ).toBeTruthy();
        expect(
            container.querySelector('[data-testid="calibration"]')
        ).not.toBeNull();
    });
});
