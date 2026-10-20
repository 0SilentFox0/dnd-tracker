import type { FrameBox } from "@/components/battle/fx/frames/kit";
import type { Stage } from "@/components/battle/fx/runtime/stage";

/** `light` — the row is a light parchment card (the spellbook), where dark washes read as a dirty box. */
interface FrameLook {
  light: boolean;
}

export type FrameAnimation = (s: Stage, box: FrameBox, look: FrameLook) => Promise<void>;
