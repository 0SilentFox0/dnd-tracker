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

import type { FxElement, FxImpact } from "@/lib/utils/battle/fx";

export const FRAME_ANIMATIONS: Record<FxElement, FrameAnimation> = {
  fire: fireFrame,
  cold: coldFrame,
  lightning: lightningFrame,
  poison: poisonFrame,
  necrotic: necroticFrame,
  radiant: radiantFrame,
  arcane: arcaneFrame,
  physical: physicalMeleeFrame,
  nature: natureFrame,
  earth: earthFrame,
  fury: furyFrame,
  wind: arcaneFrame,
};

export const HEAL_FRAME = healFrame;

export const PHYSICAL_MELEE_FRAME = physicalMeleeFrame;

export const PHYSICAL_RANGED_FRAME = physicalRangedFrame;

export function frameFor(impact: FxImpact): FrameAnimation {
  if (impact.kind === "heal") return HEAL_FRAME;

  if (impact.element === "physical") return impact.attack === "ranged" ? physicalRangedFrame : physicalMeleeFrame;

  return FRAME_ANIMATIONS[impact.element];
}
