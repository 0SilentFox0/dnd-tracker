import type { FxPoint } from "../runtime/geometry";
import type { FxPalette } from "../runtime/palette";
import type { Stage } from "../runtime/stage";

import type { FxSpec } from "@/lib/utils/battle/fx";

export interface FxRun {
  spec: FxSpec;
  stage: Stage;
  from: FxPoint;
  to: FxPoint[];
  /** The anchors behind `to`, index for index. */
  targetEls: HTMLElement[];
  actorEl: HTMLElement | null;
  palette: FxPalette;
}

export type FxAnimation = (run: FxRun) => Promise<void>;
