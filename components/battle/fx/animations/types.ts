import type { FxPoint, FxTarget } from "@/components/battle/fx/runtime/geometry";
import type { FxPalette } from "@/components/battle/fx/runtime/palette";
import type { Stage } from "@/components/battle/fx/runtime/stage";
import type { FxSpec } from "@/lib/utils/battle/fx";

interface FxRun {
  spec: FxSpec;
  stage: Stage;
  from: FxPoint;
  /** `targets`' points. */
  to: FxPoint[];
  targets: FxTarget[];
  /** Template centre when the cast was aimed at a map cell. */
  at?: FxPoint;
  actorEl: HTMLElement | null;
  palette: FxPalette;
}

export type FxAnimation = (run: FxRun) => Promise<void>;
