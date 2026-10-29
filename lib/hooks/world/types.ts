import type { WorldTool } from "./useMapDrawing";
import type { useWorldEditor } from "./useWorldEditor";

import type { WorldMapDetail, WorldMapSummary } from "@/types/world";

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
