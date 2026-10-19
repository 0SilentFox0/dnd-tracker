import type { FrameBox } from "../../runtime/frame-kit";
import type { Stage } from "../../runtime/stage";

/** `light` — the row is a light parchment card (the spellbook), where dark washes read as a dirty box. */
export interface FrameLook {
  light: boolean;
}

export type FrameAnimation = (s: Stage, box: FrameBox, look: FrameLook) => Promise<void>;
