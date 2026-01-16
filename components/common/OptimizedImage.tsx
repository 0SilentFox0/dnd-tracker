"use client";

import { useState } from "react";
import Image from "next/image";
import { normalizeImageUrl } from "@/lib/utils/image-url";

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
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = normalizeImageUrl(src);

  if (hasError && fallback) {
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
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}
