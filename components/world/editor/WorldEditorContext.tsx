"use client";

import { createContext, useContext } from "react";

import type { WorldEditorCtx, WorldTool } from "@/lib/hooks/world";

export type { WorldEditorCtx, WorldTool };

export const WorldEditorContext = createContext<WorldEditorCtx | null>(null);

export function useWorldEditorContext(): WorldEditorCtx {
  const ctx = useContext(WorldEditorContext);

  if (!ctx) throw new Error("useWorldEditorContext outside WorldEditorContext.Provider");

  return ctx;
}
