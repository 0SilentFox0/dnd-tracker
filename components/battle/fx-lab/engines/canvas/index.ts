import type { FxEngine } from "../../types";
import { curse } from "./curse";
import { fireball } from "./fireball";
import { heal } from "./heal";
import { slash } from "./slash";

import { stageFor } from "@/components/battle/fx/runtime/canvas";

export const canvasEngine: FxEngine = {
  play: (scenario, ctx) => ({ fireball, slash, heal, curse })[scenario](stageFor(ctx.layer), ctx),
};
