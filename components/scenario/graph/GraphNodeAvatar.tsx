"use client";

import { type ReactNode, useState } from "react";
import { getImageProps } from "next/image";

import { isSupabaseStorageUrl, normalizeImageUrl } from "@/lib/utils/common/image-url";

const SIZE = 80;

export function GraphNodeAvatar({ src, r, clipId, fallback }: { src: string; r: number; clipId: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState<string | null>(null);

  const url = normalizeImageUrl(src);

  if (failed === url) return <>{fallback}</>;

  const { props } = getImageProps({ src: url, alt: "", width: SIZE, height: SIZE, unoptimized: !isSupabaseStorageUrl(url) });

  return (
    <>
      <clipPath id={clipId}>
        <circle r={r - 1.5} />
      </clipPath>
      <image href={props.src} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} pointerEvents="none" {...{ referrerpolicy: "no-referrer", onError: () => setFailed(url) }} />
    </>
  );
}
