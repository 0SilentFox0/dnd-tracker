// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLayerForm } from '../useLayerForm';

import type { WorldLayer } from '@/types/world';

vi.mock('../useWorldMapUpload', () => ({
    useWorldMapUpload: () => ({
        upload: vi.fn(),
        discard: vi.fn(),
        uploading: false,
    }),
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useNotify: () => vi.fn(),
}));

const layer = {
    id: 'l1',
    name: 'Sea',
    color: null,
    heroIds: [],
    imageUrl: null,
    opacity: 1,
    icon: 'castle',
    zoneOpacity: null,
    zoneLabels: 'auto',
} as unknown as WorldLayer;

const setup = () => {
    const update = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
        useLayerForm({
            campaignId: 'c1',
            layer,
            layers: {
                update: { mutateOk: update },
                setHeroes: { isPending: false },
            } as never,
            mapAspect: 1,
        })
    );

    return { form: result.current, update };
};

describe('useLayerForm style fields', () => {
    it('clears the icon with null', () => {
        const { form, update } = setup();

        void form.setIcon(null);

        expect(update).toHaveBeenCalledWith({ id: 'l1', data: { icon: null } });
    });

    it('saves the zone label mode', () => {
        const { form, update } = setup();

        void form.setZoneLabels('hidden');

        expect(update).toHaveBeenCalledWith({
            id: 'l1',
            data: { zoneLabels: 'hidden' },
        });
    });

    it('falls back to the default fill opacity until customised', () => {
        const { form } = setup();

        expect(form.zoneOpacity.value).toBe(0.6);
        expect(form.zoneOpacity.isCustom).toBe(false);
    });
});
