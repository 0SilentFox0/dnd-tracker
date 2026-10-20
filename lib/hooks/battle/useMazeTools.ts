"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBattleScene } from "./useBattleScene";
import { IDLE_MAZE_TOOL, type MazeGenerateInput, type MazeTool, useMazeToolState } from "./useMazeToolState";
import { type MazeAsHero, useMazeView } from "./useMazeView";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { useNotify } from "@/lib/hooks/common";
import { cellKey } from "@/lib/utils/battle/grid";
import { isEdgeCell, wallSet } from "@/lib/utils/battle/maze";
import type { MazeActionData } from "@/types/api";
import type { AddParticipantData, GridPoint, MazeConfig } from "@/types/battle";

export type { MazeGenerateInput, MazeTool };

export const MAX_WALL_EDGES = 400;

export const MAZE_EXIT_EDGE_ONLY = "Вихід — лише на краю карти";

export interface MazeEdgeStroke {
  begin(edge: string): void;
  enter(edge: string): void;
  end(): void;
  pending: ReadonlySet<string>;
}

export interface MazeEditing {
  tool: MazeTool;
  stroke: MazeEdgeStroke;
  /** перша клітинка пари телепортів */
  picked: GridPoint | null;
}

export type MazeReshuffleMode = "walls" | "scatter";

export interface MazeTools {
  enabled: boolean;
  canGenerate: boolean;
  dark: boolean;
  tool: MazeTool;
  setTool(t: MazeTool): void;
  strokeEdges: MazeEdgeStroke;
  clickCell(p: GridPoint): void;
  generate(input: MazeGenerateInput): void;
  reshuffle(mode: MazeReshuffleMode, opts: { teleportPairs: number; fogPatches: number }): void;
  toggleDark(): void;
  scatterStarts(): void;
  placeUnit(body: AddParticipantData): void;
  asHero: MazeAsHero;
  heroes: { id: string; name: string }[];
  /** «Згенерувати» чекає на клітинку виходу */
  awaitingExit: boolean;
  /** для карти: null — інструмент не активний */
  editing: MazeEditing | null;
}

const EMPTY: ReadonlySet<string> = new Set();

const same = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;

interface StrokeRef {
  remove: boolean;
  edges: Set<string>;
}

export function useMazeTools(): MazeTools {
  const { battle, viewer, actions } = useBattleScene();

  const { asHero } = useMazeView();

  const { state, patch } = useMazeToolState();

  const notify = useNotify();

  const maze: MazeConfig | null = battle.map?.maze ?? null;

  const grid = useMemo(() => ({ cols: battle.map?.cols ?? 0, rows: battle.map?.rows ?? 0 }), [battle.map?.cols, battle.map?.rows]);

  const enabled = viewer.isDM && !!maze;

  const { mutate } = actions.maze;

  const { mutate: addParticipant } = actions.addParticipant;

  const send = useCallback((data: MazeActionData, onSettled?: () => void) => mutate(data, onSettled && { onSettled }), [mutate]);

  const setTool = useCallback((tool: MazeTool) => patch({ ...IDLE_MAZE_TOOL, tool }), [patch]);

  const stroke = useRef<StrokeRef | null>(null);

  const [preview, setPreview] = useState<ReadonlySet<string>>(EMPTY);

  const [sent, setSent] = useState<ReadonlySet<string>>(EMPTY);

  const latest = useRef({ maze, send });

  useEffect(() => {
    latest.current = { maze, send };
  });

  const strokeHandlers = useMemo(
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

        for (let i = 0; i < edges.length; i += MAX_WALL_EDGES) {
          const part = edges.slice(i, i + MAX_WALL_EDGES);

          setSent((prev) => new Set([...prev, ...part]));
          latest.current.send({ op: "walls", add: s.remove ? [] : part, remove: s.remove ? part : [] }, () =>
            setSent((prev) => new Set([...prev].filter((e) => !part.includes(e)))),
          );
        }
      },
    }),
    [],
  );

  const strokeEdges = useMemo<MazeEdgeStroke>(
    () => ({ ...strokeHandlers, pending: sent.size === 0 ? preview : new Set([...sent, ...preview]) }),
    [strokeHandlers, preview, sent],
  );

  const clickCell = useCallback(
    (p: GridPoint) => {
      if (!maze) return;

      const handlers: Record<MazeTool, () => void> = {
        none: () => undefined,
        walls: () => undefined,
        exit: () => {
          if (!isEdgeCell(grid, p)) {
            void notify(MAZE_EXIT_EDGE_ONLY);

            return;
          }

          if (state.pendingGenerate) {
            send({ op: "generate", ...state.pendingGenerate, exit: p });
            setTool("none");

            return;
          }

          send({ op: "exit", cell: p });
        },
        teleport: () => {
          const from = state.teleportFrom;

          if (maze.teleports.some((pair) => pair.some((c) => same(c, p)))) {
            send({ op: "teleport", pair: null, removeAt: p });
            patch({ teleportFrom: null });
          } else if (!from || same(from, p)) {
            patch({ teleportFrom: from ? null : p });
          } else {
            send({ op: "teleport", pair: [from, p] });
            patch({ teleportFrom: null });
          }
        },
        fog: () => {
          const key = cellKey(p);

          send({ op: "fog", cells: [key], on: !maze.fog.includes(key) });
        },
        placeUnit: () => {
          if (state.pendingUnit) addParticipant({ ...state.pendingUnit, position: p });

          setTool("none");
        },
      };

      handlers[state.tool]();
    },
    [maze, grid, state, notify, send, setTool, patch, addParticipant],
  );

  const generate = useCallback(
    ({ exit, ...rest }: MazeGenerateInput) => {
      if (exit === "pick") patch({ ...IDLE_MAZE_TOOL, tool: "exit", pendingGenerate: rest });
      else send({ op: "generate", ...rest, exit: null });
    },
    [patch, send],
  );

  const reshuffle = useCallback<MazeTools["reshuffle"]>((mode, opts) => send({ op: "reshuffle", mode, ...opts }), [send]);

  const dark = !!maze?.dark;

  const toggleDark = useCallback(() => send({ op: "dark", on: !dark }), [send, dark]);

  const scatterStarts = useCallback(() => send({ op: "scatterStarts" }), [send]);

  const placeUnit = useCallback((body: AddParticipantData) => patch({ ...IDLE_MAZE_TOOL, tool: "placeUnit", pendingUnit: body }), [patch]);

  const tool = enabled ? state.tool : "none";

  useEffect(() => {
    if (tool === "none") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTool("none");
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [tool, setTool]);

  const order = battle.initiativeOrder;

  const heroes = useMemo(
    () =>
      (order ?? [])
        .filter((p) => p.basicInfo.side === ParticipantSide.ALLY && p.basicInfo.sourceType === ParticipantSourceType.CHARACTER)
        .map((p) => ({ id: p.basicInfo.id, name: p.basicInfo.name })),
    [order],
  );

  const editing = useMemo(() => (tool === "none" ? null : { tool, stroke: strokeEdges, picked: state.teleportFrom }), [tool, strokeEdges, state.teleportFrom]);

  return {
    enabled,
    canGenerate: !maze?.moved,
    dark,
    tool,
    setTool,
    strokeEdges,
    clickCell,
    generate,
    reshuffle,
    toggleDark,
    scatterStarts,
    placeUnit,
    asHero,
    heroes,
    awaitingExit: state.pendingGenerate !== null,
    editing,
  };
}
