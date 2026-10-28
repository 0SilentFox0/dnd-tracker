"use client";

import { createContext, useContext } from "react";

import type { useWorldEditor, WorldTool } from "@/lib/hooks/world";
import type { WorldMapDetail, WorldMapSummary } from "@/types/world";

export type { WorldTool };

export interface WorldEditorCtx {
  campaignId: string;
  detail: WorldMapDetail | null;
  maps: WorldMapSummary[];
  editor: ReturnType<typeof useWorldEditor>;
  selectedId: string | null;
  select(id: string | null): void;
  openMap(mapId: string | null): void;
  tool: WorldTool;
  setTool(tool: WorldTool): void;
  redrawId: string | null;
  redraw(markerId: string | null): void;
}

export const WorldEditorContext = createContext<WorldEditorCtx | null>(null);

export function useWorldEditorContext(): WorldEditorCtx {
  const ctx = useContext(WorldEditorContext);

  if (!ctx) throw new Error("useWorldEditorContext outside WorldEditorContext.Provider");

  return ctx;
}
