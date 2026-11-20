'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useCommittedName } from './useCommittedName';
import type { useWorldEditor } from './useWorldEditor';
import { useWorldMapUpload } from './useWorldMapUpload';

import {
    DEFAULT_ZONE_COLOR,
    WORLD_LAYER_OPACITY,
} from '@/lib/constants/world';
import { useDebouncedCommit, useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';
import { clampRect } from '@/lib/utils/world/layer-rect';
import type { LayerVisibility, WorldLayer } from '@/types/world';

const FIRST_IMAGE_WIDTH = 0.5;

interface Options {
    campaignId: string;
    layer: WorldLayer;
    layers: ReturnType<typeof useWorldEditor>['layers'];
    mapAspect: number;
}

export function useLayerForm({
    campaignId,
    layer,
    layers,
    mapAspect,
}: Options) {
    const t = useTranslations('world');

    const notify = useNotify();

    const { upload, discard, uploading } = useWorldMapUpload(campaignId);

    const save = (data: Parameters<typeof layers.update.mutateOk>[0]['data']) =>
        layers.update.mutateOk({ id: layer.id, data });

    const { name, setName, commitName } = useCommittedName(layer.name, (next) =>
        save({ name: next })
    );

    const [color, setColor] = useState(layer.color);

    const colorCommit = useDebouncedCommit((value: string | null) =>
        save({ color: value })
    );

    const [opacity, setOpacity] = useState(layer.opacity);

    const opacityCommit = useDebouncedCommit((value: number) =>
        save({ opacity: value })
    );

    const pickColor = (c: string | null) => {
        setColor(c);
        colorCommit.schedule(c);
    };

    const changeOpacity = (value: number) => {
        setOpacity(value);
        opacityCommit.schedule(value);
    };

    const toggleHero = (heroId: string, on: boolean) => {
        const ids = on
            ? [...layer.heroIds, heroId]
            : layer.heroIds.filter((id) => id !== heroId);

        return layers.setHeroes.mutateOk({ id: layer.id, heroIds: ids });
    };

    const uploadImage = async (file: File) => {
        let image;

        try {
            image = await upload(file);
        } catch (err) {
            void notify(errorMessage(err, t('errors.uploadFailed')));

            return;
        }

        // the first image keeps its own aspect ratio on the map
        const rect = layer.imageUrl
            ? undefined
            : clampRect({
                  x: 0,
                  y: 0,
                  w: FIRST_IMAGE_WIDTH,
                  h:
                      (FIRST_IMAGE_WIDTH * image.width * mapAspect) /
                      image.height,
              });

        const ok = await save(
            rect
                ? { imageUrl: image.imageUrl, rect }
                : { imageUrl: image.imageUrl }
        );

        if (!ok) void discard(image.imageUrl);
    };

    return {
        name,
        setName,
        commitName,
        color,
        colorValue: color ?? DEFAULT_ZONE_COLOR,
        isCustomColor: !!color && color.toLowerCase() !== DEFAULT_ZONE_COLOR,
        pickColor,
        resetColor: () => pickColor(null),
        opacity,
        changeOpacity,
        opacityRange: WORLD_LAYER_OPACITY,
        setVisibility: (visibility: LayerVisibility) => save({ visibility }),
        toggleHero,
        uploadImage,
        uploading,
        clearImage: () => save({ imageUrl: null }),
    };
}
