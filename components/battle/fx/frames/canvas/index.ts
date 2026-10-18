import { arcaneFrame } from "./arcane";
import { coldFrame } from "./cold";
import { earthFrame } from "./earth";
import { fireFrame } from "./fire";
import { furyFrame } from "./fury";
import { healFrame } from "./heal";
import { lightningFrame } from "./lightning";
import { natureFrame } from "./nature";
import { necroticFrame } from "./necrotic";
import { physicalMeleeFrame } from "./physical-melee";
import { physicalRangedFrame } from "./physical-ranged";
import { poisonFrame } from "./poison";
import { radiantFrame } from "./radiant";
import type { FrameAnimation } from "./types";
import { windFrame } from "./wind";

import { frameKindOf,type FxFrameKind, type FxImpact } from "@/lib/utils/battle/fx";

export const FRAMES: Record<FxFrameKind, FrameAnimation> = {
  fire: fireFrame,
  cold: coldFrame,
  lightning: lightningFrame,
  poison: poisonFrame,
  necrotic: necroticFrame,
  radiant: radiantFrame,
  arcane: arcaneFrame,
  nature: natureFrame,
  earth: earthFrame,
  fury: furyFrame,
  wind: windFrame,
  heal: healFrame,
  "physical-melee": physicalMeleeFrame,
  "physical-ranged": physicalRangedFrame,
};

export function frameFor(impact: FxImpact): FrameAnimation {
  return FRAMES[frameKindOf(impact)];
}
