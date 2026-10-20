"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useBattleScene } from "../../useBattleScene";
import { type MazeEdgeStroke, useMazeEdgeStroke } from "./useMazeEdgeStroke";
import { IDLE_MAZE_TOOL, type MazeGenerateInput, type MazeTool, useMazeToolState } from "./useMazeToolState";
import { type MazeAsHero, useMazeView } from "./useMazeView";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { useNotify } from "@/lib/hooks/common";
import { cellKey, samePoint } from "@/lib/utils/battle/grid";
import { isEdgeCell } from "@/lib/utils/battle/modes/maze";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { MazeActionData } from "@/types/api";
import type { GridPoint, MazeConfig } from "@/types/battle";

export type { MazeEdgeStroke, MazeGenerateInput, MazeTool };

export interface MazeEditing {
  tool: MazeTool;
  stroke: MazeEdgeStroke;
  picked: GridPoint | null;
}

export type MazeReshuffleMode = "walls" | "scatter" | "tunnel";

export interface MazeToolsState {
  tool: MazeTool;
  dark: boolean;
  canGenerate: boolean;
  /** «Згенерувати» чекає на клітинку виходу */
  awaitingExit: boolean;
  heroes: { id: string; name: string }[];
}

export interface MazeToolsActions {
  setTool(t: MazeTool): void;
  clickCell(p: GridPoint): void;
  generate(input: MazeGenerateInput): void;
  reshuffle(mode: MazeReshuffleMode, opts: { teleportPairs: number; fogPatches: number }): void;
  toggleDark(): void;
  scatterStarts(): void;
}

export interface MazeTools {
  state: MazeToolsState;
  actions: MazeToolsActions;
  /** для карти: null — інструмент не активний */
  editing: MazeEditing | null;
  asHero: MazeAsHero;
}

/** Інструменти ДМ у лабіринті; null — не ДМ або бій без лабіринту. */
export function useMazeTools(): MazeTools | null {
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

  const stroke = useMazeEdgeStroke(maze, send);

  const clickCell = useCallback(
    (p: GridPoint) => {
      if (!maze) return;

      const handlers: Record<MazeTool, () => void> = {
        none: () => undefined,
        walls: () => undefined,
        exit: () => {
          if (!isEdgeCell(grid, p)) {
            void notify(MAZE_TEXTS.exitOnEdge);

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

          if (maze.teleports.some((pair) => pair.some((c) => samePoint(c, p)))) {
            send({ op: "teleport", pair: null, removeAt: p });
            patch({ teleportFrom: null });
          } else if (!from || samePoint(from, p)) {
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

  const reshuffle = useCallback<MazeToolsActions["reshuffle"]>((mode, opts) => send({ op: "reshuffle", mode, ...opts }), [send]);

  const dark = !!maze?.dark;

  const toggleDark = useCallback(() => send({ op: "dark", on: !dark }), [send, dark]);

  const scatterStarts = useCallback(() => send({ op: "scatterStarts" }), [send]);

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

  const editing = useMemo(() => (tool === "none" ? null : { tool, stroke, picked: state.teleportFrom }), [tool, stroke, state.teleportFrom]);

  const canGenerate = !maze?.moved;

  const awaitingExit = state.pendingGenerate !== null;

  const toolsState = useMemo(() => ({ tool, dark, canGenerate, awaitingExit, heroes }), [tool, dark, canGenerate, awaitingExit, heroes]);

  const toolsActions = useMemo(
    () => ({ setTool, clickCell, generate, reshuffle, toggleDark, scatterStarts }),
    [setTool, clickCell, generate, reshuffle, toggleDark, scatterStarts],
  );

  const tools = useMemo(() => ({ state: toolsState, actions: toolsActions, editing, asHero }), [toolsState, toolsActions, editing, asHero]);

  return enabled ? tools : null;
}
