import type { FxPoint } from "./geometry";

import type { FxSpec } from "@/lib/utils/battle/fx";

interface Box {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const overlaps = (r: Box, v: Box) => r.bottom > v.top && r.right > v.left && r.top < v.bottom && r.left < v.right;

/** Прокручувана обгортка карти (телефон): токен, прокручений за її край, не видно, хоч він і у вікні. */
function scrollViewport(el: HTMLElement): Box | null {
  const scroller = el.closest<HTMLElement>("[data-fx-clip]")?.parentElement;

  return scroller && scroller.scrollHeight > scroller.clientHeight ? scroller.getBoundingClientRect() : null;
}

const RANK: Record<string, number> = { map: 0, detail: 2, track: 3 };

/** map > main (без атрибута) > detail > track */
export function anchorRank(el: HTMLElement): number {
  return RANK[el.dataset.fxAnchor ?? ""] ?? 1;
}

const clipBox = (el: HTMLElement): Box | null => el.closest<HTMLElement>("[data-fx-clip]")?.getBoundingClientRect() ?? null;

export function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();

  if (r.width <= 0 || r.height <= 0 || !overlaps(r, { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth })) return false;

  // зум і панорама виносять токен за межі карти, хоч він і в межах вікна
  const clip = clipBox(el);

  if (clip && !overlaps(r, clip)) return false;

  const viewport = scrollViewport(el);

  return !viewport || overlaps(r, viewport);
}

const escape = (id: string) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"'));

function findAnchor(id: string, root: ParentNode = document): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(`[data-fx-participant="${escape(id)}"]`)].filter(visible);

  return all.sort((a, b) => anchorRank(a) - anchorRank(b))[0] ?? null;
}

function centerOf(el: HTMLElement): FxPoint {
  const r = el.getBoundingClientRect();

  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function cellPoint(at: { x: number; y: number }, root: ParentNode): FxPoint | undefined {
  const el = root.querySelector<HTMLElement>(`[data-fx-cell="${at.x}:${at.y}"]`);

  return el && visible(el) ? centerOf(el) : undefined;
}

export function resolvePoints(spec: FxSpec, root: ParentNode = document): { from: FxPoint; to: FxPoint[]; at?: FxPoint; targetEls: HTMLElement[]; actorEl: HTMLElement | null } | null {
  const targetEls = spec.targetIds.flatMap((id) => findAnchor(id, root) ?? []);

  const to = targetEls.map(centerOf);

  const cell = spec.at && cellPoint(spec.at, root);

  if (to.length === 0) return null;

  if (spec.archetype === "death") return { from: to[0], to, targetEls, actorEl: null };

  const actorEl = findAnchor(spec.actorId, root);

  const from = actorEl ? centerOf(actorEl) : { x: to[0].x, y: spec.actorSide === "enemy" ? -20 : window.innerHeight + 20 };

  return { from, to, ...(cell && { at: cell }), targetEls, actorEl };
}

/** Half the width and height of a target row, for effects that wrap it; `fallback` when it is gone. */
export function halfSize(el: HTMLElement | null | undefined, fallback = { w: 88, h: 30 }) {
  const r = el?.getBoundingClientRect();

  return r && r.width > 0 ? { w: r.width / 2, h: r.height / 2 } : fallback;
}

/** The portrait of a target at `at` (its centre, in layer coordinates): a wide row keeps it at its left end, a portrait anchor is the face itself. */
export function faceOf(el: HTMLElement | null | undefined, at: FxPoint) {
  const r = el?.getBoundingClientRect();

  if (!r || r.width <= 0) return { x: at.x, y: at.y, r: 22 };

  if (r.width > r.height * 1.6) return { x: at.x - r.width / 2 + r.height * 0.55, y: at.y, r: r.height * 0.34 };

  return { x: at.x, y: at.y, r: Math.min(r.width, r.height) / 2 };
}
