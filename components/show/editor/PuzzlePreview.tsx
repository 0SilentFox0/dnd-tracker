"use client";

import { useMemo } from "react";

import { generatePuzzle } from "@/lib/utils/puzzle/generate";
import type { PuzzleSpec } from "@/types/show";

export function PuzzlePreview({ spec, imageUrl }: { spec: PuzzleSpec; imageUrl: string }) {
  const pieces = useMemo(() => generatePuzzle(spec), [spec]);

  const stroke = Math.max(spec.imageWidth, spec.imageHeight) / 400;

  return (
    <svg role="img" aria-label="Нарізка пазла" viewBox={`0 0 ${spec.imageWidth} ${spec.imageHeight}`} className="max-h-72 w-full rounded bg-black">
      <image href={imageUrl} width={spec.imageWidth} height={spec.imageHeight} preserveAspectRatio="none" />
      {pieces.map((p) => (
        <path key={p.id} d={p.path} fill="none" stroke="white" strokeOpacity={0.85} strokeWidth={stroke} />
      ))}
    </svg>
  );
}
