"use client";

import { memo } from "react";

import { parseCellKey, UNIT } from "@/lib/utils/battle/grid";
import type { MazeView } from "@/lib/utils/battle/view";

/** ДМ бачить, що зараз бачить загін: світла підсвітка клітинок під токенами. */
export const MazePartyVision = memo(function MazePartyVision({ view }: { view: MazeView | null | undefined }) {
  const cells = view?.role === "dm" ? view.partyCells : null;

  if (!cells?.size) return null;

  return (
    <g pointerEvents="none" data-maze-party-vision="">
      {[...cells].map((key) => {
        const { x, y } = parseCellKey(key);

        return <rect key={key} className="maze-seen" data-maze-seen={key} x={x * UNIT} y={y * UNIT} width={UNIT} height={UNIT} />;
      })}
    </g>
  );
});
