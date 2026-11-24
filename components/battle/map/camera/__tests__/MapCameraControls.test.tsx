// @vitest-environment happy-dom
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MapCameraControls } from '../MapCameraControls';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

describe('MapCameraControls', () => {
    it('labels zoom buttons, calls controls, and hides recenter without a target', () => {
        const onZoomIn = vi.fn();

        const onZoomOut = vi.fn();

        const onRecenter = vi.fn();

        const { getByRole, queryByRole } = render(
            <MapCameraControls
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                onRecenter={onRecenter}
                zoom={1.25}
                canRecenter={false}
                userMoved={false}
                phone={false}
            />
        );

        fireEvent.click(getByRole('button', { name: 'Збільшити мапу' }));
        fireEvent.click(getByRole('button', { name: 'Зменшити мапу' }));
        expect(onZoomIn).toHaveBeenCalledOnce();
        expect(onZoomOut).toHaveBeenCalledOnce();
        expect(queryByRole('button', { name: 'До себе' })).toBeNull();
        expect(getByRole('status').textContent).toBe('125%');
    });
});
