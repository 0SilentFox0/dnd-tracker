'use client';

import { useState } from 'react';
import Image from 'next/image';

import {
    isSupabaseStorageUrl,
    normalizeImageUrl,
} from '@/lib/utils/common/image-url';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    fallback?: React.ReactNode;
}

export function OptimizedImage({
    src,
    alt,
    width,
    height,
    className,
    fallback,
}: OptimizedImageProps) {
    const normalizedSrc = normalizeImageUrl(src);

    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    const hasError = failedSrc === normalizedSrc;

    if (hasError && fallback !== undefined) {
        return <>{fallback}</>;
    }

    return (
        <Image
            src={normalizedSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
            referrerPolicy="no-referrer"
            unoptimized={!isSupabaseStorageUrl(normalizedSrc)}
            onError={() => setFailedSrc(normalizedSrc)}
        />
    );
}
