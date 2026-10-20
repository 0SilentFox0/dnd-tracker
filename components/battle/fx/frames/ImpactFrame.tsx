import { CanvasFrame } from "./CanvasFrame";
import { frameFor } from "./index";

import type { FxImpact } from "@/lib/utils/battle/fx";

export function ImpactFrame({ impact }: { impact: FxImpact }) {
  return <CanvasFrame frame={frameFor(impact)} delayMs={impact.delayMs} />;
}
