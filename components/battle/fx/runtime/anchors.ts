import type { FxPoint, FxTarget } from "./geometry";

import type { FxSpec } from "@/lib/utils/battle/fx";

interface Box {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const overlaps = (r: Box, v: Box) => r.bottom > v.top && r.right > v.left && r.top < v.bottom && r.left < v.right;

/** The map's scrolling wrapper (phones): a token scrolled past its edge is hidden even while inside the window. */
function scrollViewport(el: HTMLElement): Box | null {
  const scroller = el.closest<HTMLElement>("[data-fx-clip]")?.parentElement;

  return scroller && scroller.scrollHeight > scroller.clientHeight ? scroller.getBoundingClientRect() : null;
}

const RANK: Record<string, number> = { map: 0, detail: 2, track: 3 };

/** map > main (no attribute) > detail > track */
export function anchorRank(el: HTMLElement): number {
  return RANK[el.dataset.fxAnchor ?? ""] ?? 1;
}

const clipBox = (el: HTMLElement): Box | null => el.closest<HTMLElement>("[data-fx-clip]")?.getBoundingClientRect() ?? null;

export function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();

  if (r.width <= 0 || r.height <= 0 || !overlaps(r, { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth })) return false;

  // zoom and pan move a token off the map while it is still inside the window
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
  // the map may be mounted twice (phone/desktop): take the visible copy
  const el = [...root.querySelectorAll<HTMLElement>(`[data-fx-cell="${at.x}:${at.y}"]`)].find(visible);

  return el && centerOf(el);
}

export function resolvePoints(spec: FxSpec, root: ParentNode = document): { from: FxPoint; targets: FxTarget[]; at?: FxPoint; actorEl: HTMLElement | null } | null {
  const found = spec.targetIds.flatMap((id) => findAnchor(id, root) ?? []).map((el) => ({ at: centerOf(el), el }));

  const cell = spec.at && cellPoint(spec.at, root);

  // a cast into an empty zone flies to the aimed cell, when it is visible
  const targets: FxTarget[] = spec.targetIds.length === 0 && cell ? [{ at: cell, el: null }] : found;

  if (targets.length === 0) return null;

  if (spec.archetype === "death") return { from: targets[0].at, targets, actorEl: null };

  const actorEl = findAnchor(spec.originId ?? spec.actorId, root);

  const from = actorEl ? centerOf(actorEl) : { x: targets[0].at.x, y: spec.actorSide === "enemy" ? -20 : window.innerHeight + 20 };

  return { from, targets, ...(cell && { at: cell }), actorEl };
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
