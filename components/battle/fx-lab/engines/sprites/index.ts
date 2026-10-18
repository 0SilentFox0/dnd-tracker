import type { FxEngine } from "../../types";
import { curse } from "./curse";
import { fireball } from "./fireball";
import { heal } from "./heal";
import { slash } from "./slash";

export const spritesEngine: FxEngine = {
  play: (scenario, ctx) => ({ fireball, slash, heal, curse })[scenario](ctx),
};
