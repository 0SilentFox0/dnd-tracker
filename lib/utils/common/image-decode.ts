import { toMediaUrl } from '@/lib/utils/common/image-url';

export interface ImageDimensions {
    width: number;
    height: number;
}

/** The single `createImageBitmap` entry point; the caller closes the bitmap. */
export function decodeBitmap(source: Blob): Promise<ImageBitmap> {
    return createImageBitmap(source);
}

export async function imageSizeOf(source: Blob): Promise<ImageDimensions> {
    const bitmap = await decodeBitmap(source);

    const { width, height } = bitmap;

    bitmap.close();

    return { width, height };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(src));
        image.src = toMediaUrl(src);
    });
}
