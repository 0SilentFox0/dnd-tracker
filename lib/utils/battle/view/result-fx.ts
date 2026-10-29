import type { ActionResultFx, ResultFx } from "@/types/battle-scene";

export const isActionResult = (fx: ResultFx | null): fx is ActionResultFx => !!fx && fx.kind !== "morale-extra" && fx.kind !== "morale-skip";
