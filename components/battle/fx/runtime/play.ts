import { resolvePoints } from "./anchors";
import type { FxPoint } from "./geometry";
import { PALETTE } from "./palette";
import { layerEpoch, stageFor } from "./stage";

import { animationFor } from "@/components/battle/fx/animations";
import type { FxSpec } from "@/lib/utils/battle/fx";

/** How long a run waits for its signature chunk before playing the base fallback (battle queue only). */
export const FX_LOAD_TIMEOUT_MS = 800;

/**
 * Plays `spec` on `layer`, with anchors looked up under `root` and points taken relative to the layer.
 * A signature not loaded yet is awaited up to `loadTimeoutMs`; a `cancelLayer` meanwhile drops the run.
 */
export async function playFx(layer: HTMLElement, spec: FxSpec, root: ParentNode = document, loadTimeoutMs = FX_LOAD_TIMEOUT_MS, onStart?: () => void): Promise<void> {
  const epoch = layerEpoch(layer);

  // signature animations draw on their targets, so an empty zone plays the base "area"
  const animation = await animationFor(spec.targetIds.length === 0 && spec.at ? "area" : spec.archetype, loadTimeoutMs);

  if (layerEpoch(layer) !== epoch || !layer.isConnected) return;

  const points = resolvePoints(spec, root);

  if (!points) return;

  const box = layer.getBoundingClientRect();

  const local = (p: FxPoint) => ({ x: p.x - box.left, y: p.y - box.top });

  const targets = points.targets.map((t) => ({ at: local(t.at), el: t.el }));

  onStart?.();

  return animation({ spec, stage: stageFor(layer), from: local(points.from), to: targets.map((t) => t.at), targets, ...(points.at && { at: local(points.at) }), actorEl: points.actorEl, palette: PALETTE[spec.element] });
}
