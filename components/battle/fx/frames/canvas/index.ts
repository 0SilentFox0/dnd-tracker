import { arcaneFrame } from "./arcane";
import { coldFrame } from "./cold";
import { earthFrame } from "./earth";
import { fireFrame } from "./fire";
import { furyFrame } from "./fury";
import { healFrame } from "./heal";
import { lightningFrame } from "./lightning";
import { natureFrame } from "./nature";
import { necroticFrame } from "./necrotic";
import { physicalFrame } from "./physical";
import { poisonFrame } from "./poison";
import { radiantFrame } from "./radiant";
import type { FrameAnimation } from "./types";

import type { FxElement } from "@/lib/utils/battle/fx";

export const FRAME_ANIMATIONS: Record<FxElement, FrameAnimation> = {
  fire: fireFrame,
  cold: coldFrame,
  lightning: lightningFrame,
  poison: poisonFrame,
  necrotic: necroticFrame,
  radiant: radiantFrame,
  arcane: arcaneFrame,
  physical: physicalFrame,
  nature: natureFrame,
  earth: earthFrame,
  fury: furyFrame,
};

export const HEAL_FRAME = healFrame;
