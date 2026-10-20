"use client";

import { useMemo } from "react";

import type { ModeTools } from "../tools";
import { useMazeTools } from "./useMazeTools";

export function useMazeModeTools(): ModeTools | null {
  const tools = useMazeTools();

  return useMemo(
    () =>
      tools && {
        panLocked: tools.editing?.tool === "walls",
        toolActive: tools.state.tool !== "none",
        paletteOpen: tools.state.tool !== "none",
        clickCell: tools.actions.clickCell,
        closeTool: () => tools.actions.setTool("none"),
        raw: tools,
      },
    [tools],
  );
}
