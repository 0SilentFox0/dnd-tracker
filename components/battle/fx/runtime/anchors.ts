import type { FxPoint } from "./geometry";

import type { FxSpec } from "@/lib/utils/battle/fx";

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();

  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

const escape = (id: string) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"'));

export function findAnchor(id: string, root: ParentNode = document): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(`[data-fx-participant="${escape(id)}"]`)].filter(visible);

  return all.find((el) => el.dataset.fxAnchor !== "track") ?? all[0] ?? null;
}

export function centerOf(el: HTMLElement): FxPoint {
  const r = el.getBoundingClientRect();

  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function resolvePoints(spec: FxSpec, root: ParentNode = document): { from: FxPoint; to: FxPoint[]; targetEls: HTMLElement[]; actorEl: HTMLElement | null } | null {
  const targetEls = spec.targetIds.flatMap((id) => findAnchor(id, root) ?? []);

  const to = targetEls.map(centerOf);

  if (to.length === 0) return null;

  if (spec.archetype === "death") return { from: to[0], to, targetEls, actorEl: null };

  const actorEl = findAnchor(spec.actorId, root);

  const from = actorEl ? centerOf(actorEl) : { x: to[0].x, y: spec.actorSide === "enemy" ? -20 : window.innerHeight + 20 };

  return { from, to, targetEls, actorEl };
}

/** Half the width and height of a target row, for effects that wrap it; `fallback` when it is gone. */
export function halfSize(el: HTMLElement | null | undefined, fallback = { w: 88, h: 30 }) {
  const r = el?.getBoundingClientRect();

  return r && r.width > 0 ? { w: r.width / 2, h: r.height / 2 } : fallback;
}
