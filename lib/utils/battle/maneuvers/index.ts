import { landDive, startDive } from "./dive";
import { fireBurst } from "./fire-burst";
import { squall } from "./squall";
import type { ManeuverInput, ManeuverResult } from "./types";

import type { Maneuver } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export type { ManeuverInput, ManeuverResult };

export { landDive };

export const MANEUVER_RUNNERS: Record<Maneuver, (ps: BattleParticipant[], input: ManeuverInput) => ManeuverResult> = { dive: startDive, squall, fireBurst };
