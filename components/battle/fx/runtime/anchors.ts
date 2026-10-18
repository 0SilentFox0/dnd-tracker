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

export function resolvePoints(spec: FxSpec, root: ParentNode = document): { from: FxPoint; to: FxPoint[]; actorEl: HTMLElement | null } | null {
  const to = spec.targetIds.flatMap((id) => {
    const el = findAnchor(id, root);

    return el ? [centerOf(el)] : [];
  });

  if (to.length === 0) return null;

  if (spec.archetype === "death") return { from: to[0], to, actorEl: null };

  const actorEl = findAnchor(spec.actorId, root);

  const from = actorEl ? centerOf(actorEl) : { x: to[0].x, y: spec.actorSide === "enemy" ? -20 : window.innerHeight + 20 };

  return { from, to, actorEl };
}
