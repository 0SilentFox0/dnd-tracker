import { useId } from "react";

import { pieceDiag,type PuzzlePiece } from "@/lib/utils/puzzle/generate";
import type { PuzzleSpec } from "@/types/show";

interface Props {
  piece: PuzzlePiece;
  spec: PuzzleSpec;
  imageUrl: string;
  rot: number;
  outline?: boolean;
}

export function PuzzlePieceView({ piece, spec, imageUrl, rot, outline = true }: Props) {
  const clipId = useId();

  const d = pieceDiag(piece);

  const { x, y } = piece.home;

  return (
    <svg viewBox={`${x - d / 2} ${y - d / 2} ${d} ${d}`} className="h-full w-full overflow-visible" style={{ pointerEvents: "none" }}>
      <defs>
        <clipPath id={clipId}>
          <path d={piece.path} />
        </clipPath>
      </defs>
      <g transform={`rotate(${rot} ${x} ${y})`}>
        <g clipPath={`url(#${clipId})`} style={{ pointerEvents: "auto" }}>
          <image href={imageUrl} width={spec.imageWidth} height={spec.imageHeight} />
        </g>
        {outline && <path d={piece.path} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={Math.max(1, d / 60)} />}
      </g>
    </svg>
  );
}
