import { CanvasFrame } from "./canvas/CanvasFrame";
import { FRAME_ANIMATIONS, HEAL_FRAME } from "./canvas";

import type { FxImpact } from "@/lib/utils/battle/fx";

export function ImpactFrame({ impact }: { impact: FxImpact }) {
  return <CanvasFrame frame={impact.kind === "heal" ? HEAL_FRAME : FRAME_ANIMATIONS[impact.element]} delayMs={impact.delayMs} />;
}
