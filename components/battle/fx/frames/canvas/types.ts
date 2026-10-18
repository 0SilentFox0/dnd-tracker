import type { FrameBox } from "../../runtime/frame-kit";
import type { Stage } from "../../runtime/stage";

export type FrameAnimation = (s: Stage, box: FrameBox) => Promise<void>;
