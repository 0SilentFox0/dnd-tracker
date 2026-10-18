import { area } from "./area";
import { bolt } from "./bolt";
import { buff } from "./buff";
import { death } from "./death";
import { debuff } from "./debuff";
import { eldritch } from "./eldritch";
import { entangle } from "./entangle";
import { haste } from "./haste";
import { heal } from "./heal";
import { melee } from "./melee";
import { meteor } from "./meteor";
import { quake } from "./quake";
import { ranged } from "./ranged";
import { slow } from "./slow";
import { stoneskin } from "./stoneskin";
import { summon } from "./summon";
import { swarm } from "./swarm";
import { teleport } from "./teleport";
import type { FxAnimation } from "./types";

import type { FxArchetype } from "@/lib/utils/battle/fx";

export const ANIMATIONS: Record<FxArchetype, FxAnimation> = { melee, ranged, bolt, area, heal, buff, debuff, summon, death, swarm, quake, teleport, entangle, meteor, eldritch, slow, haste, stoneskin };
