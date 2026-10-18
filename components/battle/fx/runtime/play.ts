import { ANIMATIONS } from "../animations";
import { resolvePoints } from "./anchors";
import type { FxPoint } from "./geometry";
import { PALETTE } from "./palette";
import { stageFor } from "./stage";

import type { FxSpec } from "@/lib/utils/battle/fx";

/** Plays `spec` on `layer`, with anchors looked up under `root` and points taken relative to the layer. */
export function playFx(layer: HTMLElement, spec: FxSpec, root: ParentNode = document): Promise<void> {
  const points = resolvePoints(spec, root);

  if (!points) return Promise.resolve();

  const box = layer.getBoundingClientRect();

  const local = (p: FxPoint) => ({ x: p.x - box.left, y: p.y - box.top });

  return ANIMATIONS[spec.archetype]({ spec, stage: stageFor(layer), from: local(points.from), to: points.to.map(local), actorEl: points.actorEl, palette: PALETTE[spec.element] });
}
