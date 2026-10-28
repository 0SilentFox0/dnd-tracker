"use client";

import { useMemo, useRef } from "react";

import { PuzzleBoard } from "./PuzzleBoard";
import { PuzzleHand } from "./PuzzleHand";
import { PuzzleTray } from "./PuzzleTray";
import type { PuzzleScene } from "./types";

import { Button } from "@/components/ui/button";
import { useConfirm, useElementSize, useNotify } from "@/lib/hooks/common";
import { usePuzzleControl, usePuzzleDrag } from "@/lib/hooks/show";
import { generatePuzzle } from "@/lib/utils/puzzle/generate";
import type { PuzzleSpec, PuzzleState } from "@/types/show";

interface Props {
  campaignId: string;
  isDM: boolean;
  userId: string;
  spec: PuzzleSpec;
  imageUrl: string;
  puzzle: PuzzleState;
}

export function PuzzleStage({ campaignId, isDM, userId, spec, imageUrl, puzzle }: Props) {
  const notify = useNotify();

  const confirm = useConfirm();

  const control = usePuzzleControl(campaignId, notify);

  const pieces = useMemo(() => generatePuzzle(spec), [spec]);

  const boardRef = useRef<HTMLDivElement>(null);

  const { drag, start, rotate } = usePuzzleDrag({ puzzle, spec, userId, isDM, control, boardRef });

  const { ref: areaRef, size } = useElementSize<HTMLDivElement>();

  const fit = Math.min(size.width / spec.imageWidth, size.height / spec.imageHeight);

  const boardStyle = fit > 0 ? { width: spec.imageWidth * fit, height: spec.imageHeight * fit } : { width: "100%", aspectRatio: `${spec.imageWidth}/${spec.imageHeight}` };

  const scene: PuzzleScene = { pieces, state: puzzle, spec, imageUrl, userId, draggingId: drag?.id ?? null, onGrab: start };

  const held = pieces.find((p) => p.id === drag?.id);

  const reset = async () => {
    if (await confirm({ title: "Скинути пазл?", description: "Усі шматочки повернуться в сайдбар.", confirmLabel: "Скинути", destructive: true })) void control.send({ action: "puzzleReset" });
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col-reverse bg-black md:flex-row">
      <aside className="flex max-h-36 shrink-0 flex-col border-t border-white/15 md:max-h-none md:w-52 md:border-r md:border-t-0">
        <div aria-hidden className="hidden h-40 shrink-0 md:block" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PuzzleTray scene={scene} />
        </div>
      </aside>
      <div ref={areaRef} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-2">
        {isDM && (
          <div className="absolute right-2 top-2 z-20 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => void control.send({ action: "puzzleRelease" })}>
              Відпустити всі
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void reset()}>
              Скинути
            </Button>
          </div>
        )}
        <div style={boardStyle} className="max-h-full max-w-full">
          <PuzzleBoard scene={scene} boardRef={boardRef} />
        </div>
      </div>
      {drag && held && <PuzzleHand drag={drag} piece={held} spec={spec} imageUrl={imageUrl} onRotate={rotate} />}
    </div>
  );
}
