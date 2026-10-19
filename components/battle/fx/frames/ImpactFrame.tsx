import { CanvasFrame } from "./canvas/CanvasFrame";
import { frameFor } from "./canvas";

import type { FxImpact } from "@/lib/utils/battle/fx";

export function ImpactFrame({ impact }: { impact: FxImpact }) {
  return <CanvasFrame frame={frameFor(impact)} delayMs={impact.delayMs} />;
}
