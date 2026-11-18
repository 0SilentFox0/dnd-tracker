'use client';

import { useEffect, useState } from 'react';

import type { ImageSize } from '@/lib/utils/battle/grid';
import { loadImage } from '@/lib/utils/common/image-decode';

export function useImageSize(src: string | null): ImageSize | null {
    const [loaded, setLoaded] = useState<{
        src: string;
        size: ImageSize;
    } | null>(null);

    useEffect(() => {
        if (!src) return;

        let live = true;

        loadImage(src)
            .then((img) => {
                if (live && img.naturalWidth > 0 && img.naturalHeight > 0)
                    setLoaded({
                        src,
                        size: {
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                        },
                    });
            })
            .catch(() => undefined);

        return () => {
            live = false;
        };
    }, [src]);

    return loaded && loaded.src === src ? loaded.size : null;
}
