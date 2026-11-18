'use client';

import { type SyntheticEvent, useState } from 'react';

export function useLoadedAspect(src: string, onReady?: () => void) {
    const [loaded, setLoaded] = useState<{
        src: string;
        aspect: number;
    } | null>(null);

    const aspect = loaded?.src === src ? loaded.aspect : null;

    const imgProps = {
        onLoad: (e: SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;

            if (img.naturalWidth > 0)
                setLoaded({
                    src,
                    aspect: img.naturalHeight / img.naturalWidth,
                });

            onReady?.();
        },
        onError: onReady,
    };

    return { aspect, imgProps };
}
