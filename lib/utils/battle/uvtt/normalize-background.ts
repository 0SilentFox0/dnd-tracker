import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { imageSizeOf } from '@/lib/utils/common/image-decode';
import { resizeImageToBlob } from '@/lib/utils/common/image-resize';

export async function normalizeUvttBackground(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);

    if (!response.ok) throw new Error('Could not read embedded map image');

    const source = await response.blob();

    const { width, height } = await imageSizeOf(source);

    const needsResize =
        width > 2400 ||
        height > 2400 ||
        source.size > MAP_LIMITS.backgroundUploadBytes;

    if (!needsResize) return source;

    const file = new File([source], 'map-background', { type: source.type });

    for (const quality of [0.85, 0.7, 0.55]) {
        const result = await resizeImageToBlob(file, 2400, quality);

        if (result.size <= MAP_LIMITS.backgroundUploadBytes) return result;
    }
    throw new Error('The map image cannot be compressed below 8 MiB');
}
