import type { Stage } from "../runtime/canvas";
import type { FxPoint } from "../runtime/geometry";
import type { FxPalette } from "../runtime/palette";

import type { FxSpec } from "@/lib/utils/battle/fx";

export interface FxRun {
  spec: FxSpec;
  stage: Stage;
  layer: HTMLElement;
  from: FxPoint;
  to: FxPoint[];
  actorEl: HTMLElement | null;
  palette: FxPalette;
}

export type FxAnimation = (run: FxRun) => Promise<void>;
