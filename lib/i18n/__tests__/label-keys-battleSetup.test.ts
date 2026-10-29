import { expectLabelKeys } from "../test/label-keys";

import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import type { Margins, SetupTool } from "@/lib/utils/battle/grid";

const TOOLS: Record<SetupTool, true> = { blocked: true, wall: true, hazard: true, erase: true };

const MARGINS: Record<keyof Margins, true> = { top: true, right: true, bottom: true, left: true };

const statuses = Object.values(BattleStatus);

expectLabelKeys("battleSetup", "list.status", statuses);
expectLabelKeys("battleSetup", "list.sections", statuses);
expectLabelKeys("battleSetup", "map.tools", Object.keys(TOOLS));
expectLabelKeys("battleSetup", "map.margins", Object.keys(MARGINS));
expectLabelKeys("battleSetup", "roster.sides", Object.values(ParticipantSide).flatMap((side) => [`${side}.title`, `${side}.description`]));
expectLabelKeys("gameTerms", "damageTypes", DAMAGE_ELEMENT_OPTIONS.map((o) => o.value));
