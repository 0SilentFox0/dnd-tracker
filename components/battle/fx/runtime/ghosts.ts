import { animateEl, type Stage } from "./stage";

/**
 * A see-through copy of `el` laid over it in the FX layer (under the canvas), for after-images.
 * Anchor attributes, ids and canvases are stripped so the copy is never found as a participant.
 */
export function ghostOf(s: Stage, el: HTMLElement, filter: string): HTMLElement | null {
  if (s.stopped) return null;

  const box = s.layer.getBoundingClientRect();

  const r = el.getBoundingClientRect();

  const ghost = el.cloneNode(true) as HTMLElement;

  for (const n of [ghost, ...ghost.querySelectorAll<HTMLElement>("[data-fx-participant], [id]")]) {
    n.removeAttribute("data-fx-participant");
    n.removeAttribute("id");
  }

  for (const c of ghost.querySelectorAll("canvas")) c.remove();

  ghost.classList.add("fx-ghost");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, { position: "absolute", left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0", filter, opacity: "0" });
  s.layer.insertBefore(ghost, s.canvas);

  return ghost;
}

/** Plays `keyframes` on a ghost of `el` and removes it when done (or when the stage stops). */
export async function playGhost(s: Stage, el: HTMLElement, filter: string, keyframes: Keyframe[], opts: KeyframeAnimationOptions) {
  const ghost = ghostOf(s, el, filter);

  if (!ghost) return;

  try {
    await animateEl(s, ghost, keyframes, { fill: "both", ...opts });
  } finally {
    ghost.remove();
  }
}
