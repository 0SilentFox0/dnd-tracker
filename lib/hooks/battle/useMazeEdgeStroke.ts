"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MAZE_LIMITS } from "@/lib/constants/battle";
import { wallSet } from "@/lib/utils/battle/maze";
import type { MazeActionData } from "@/types/api";
import type { MazeConfig } from "@/types/battle";

export interface MazeEdgeStroke {
  begin(edge: string): void;
  enter(edge: string): void;
  end(): void;
  pending: ReadonlySet<string>;
}

type Send = (data: MazeActionData, onSettled?: () => void) => void;

interface StrokeRef {
  remove: boolean;
  edges: Set<string>;
}

const EMPTY: ReadonlySet<string> = new Set();

export function useMazeEdgeStroke(maze: MazeConfig | null, send: Send): MazeEdgeStroke {
  const stroke = useRef<StrokeRef | null>(null);

  const [preview, setPreview] = useState<ReadonlySet<string>>(EMPTY);

  const [sent, setSent] = useState<ReadonlySet<string>>(EMPTY);

  const latest = useRef({ maze, send });

  useEffect(() => {
    latest.current = { maze, send };
  });

  const handlers = useMemo(
    () => ({
      begin: (edge: string) => {
        const walls = latest.current.maze ? wallSet(latest.current.maze) : EMPTY;

        stroke.current = { remove: walls.has(edge), edges: new Set([edge]) };
        setPreview(new Set([edge]));
      },
      enter: (edge: string) => {
        const s = stroke.current;

        if (!s || s.edges.has(edge)) return;

        s.edges.add(edge);
        setPreview(new Set(s.edges));
      },
      end: () => {
        const s = stroke.current;

        stroke.current = null;
        setPreview(EMPTY);

        if (!s || !latest.current.maze) return;

        const walls = wallSet(latest.current.maze);

        // перше ребро задає дію; решта штриха лише доповнює її
        const edges = [...s.edges].filter((e) => walls.has(e) === s.remove);

        for (let i = 0; i < edges.length; i += MAZE_LIMITS.wallEdgesPerOp) {
          const part = edges.slice(i, i + MAZE_LIMITS.wallEdgesPerOp);

          setSent((prev) => new Set([...prev, ...part]));
          latest.current.send({ op: "walls", add: s.remove ? [] : part, remove: s.remove ? part : [] }, () =>
            setSent((prev) => new Set([...prev].filter((e) => !part.includes(e)))),
          );
        }
      },
    }),
    [],
  );

  return useMemo(() => ({ ...handlers, pending: sent.size === 0 ? preview : new Set([...sent, ...preview]) }), [handlers, preview, sent]);
}
