'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import { discardWorldMapUpload, uploadWorldMapImage } from '@/lib/api/world';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    WORLD_MAP_MAX_EDGE_PX,
    WORLD_MAP_MAX_PIXELS,
    WORLD_MAP_UPLOAD_QUALITY,
} from '@/lib/constants/world';
import { imageSizeOf } from '@/lib/utils/common/image-decode';
import {
    fitWithin,
    ImageResizeError,
    resizeImageToBlob,
} from '@/lib/utils/common/image-resize';

export function useWorldMapUpload(campaignId: string) {
    const t = useTranslations();

    const [uploading, setUploading] = useState(false);

    const upload = useCallback(
        async (
            file: File
        ): Promise<{ imageUrl: string; width: number; height: number }> => {
            if (!file.type.startsWith('image/'))
                throw new Error(t('world.errors.chooseImage'));

            setUploading(true);

            try {
                const size = await imageSizeOf(file);

                const { width, height } = fitWithin(
                    size.width,
                    size.height,
                    WORLD_MAP_MAX_EDGE_PX,
                    WORLD_MAP_MAX_PIXELS
                );

                const imageUrl = await uploadWorldMapImage(
                    campaignId,
                    await resizeImageToBlob(
                        file,
                        WORLD_MAP_MAX_EDGE_PX,
                        WORLD_MAP_UPLOAD_QUALITY,
                        WORLD_MAP_MAX_PIXELS
                    ).catch((e: unknown) => {
                        throw e instanceof ImageResizeError
                            ? new Error(t(e.key))
                            : e;
                    }),
                    (message) => t(API_ERRORS.IMAGE_UPLOAD_FAILED, { message })
                );

                return { imageUrl, width, height };
            } finally {
                setUploading(false);
            }
        },
        [campaignId, t]
    );

    const discard = useCallback(
        (imageUrl: string) =>
            discardWorldMapUpload(campaignId, imageUrl).catch(() => undefined),
        [campaignId]
    );

    return { upload, discard, uploading };
}
