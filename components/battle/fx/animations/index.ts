import { area } from "./area";
import { bolt } from "./bolt";
import { buff } from "./buff";
import { death } from "./death";
import { debuff } from "./debuff";
import { heal } from "./heal";
import { melee } from "./melee";
import { ranged } from "./ranged";
import { summon } from "./summon";
import type { FxAnimation } from "./types";

import type { FxArchetype } from "@/lib/utils/battle/fx";

export const ANIMATIONS: Record<FxArchetype, FxAnimation> = { melee, ranged, bolt, area, heal, buff, debuff, summon, death };
