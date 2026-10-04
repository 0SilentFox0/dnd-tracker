"use client";

import { useState } from "react";
import Image from "next/image";

import {
  isSupabaseStorageUrl,
  normalizeImageUrl,
} from "@/lib/utils/common/image-url";

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

  // помилка прив'язана до конкретної адреси: нова src (введення URL) знову пробує завантажити
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
      // зовнішні хости можуть бути не в remotePatterns; Supabase — через кеш Vercel, щоб не палити egress
      unoptimized={!isSupabaseStorageUrl(normalizedSrc)}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}
