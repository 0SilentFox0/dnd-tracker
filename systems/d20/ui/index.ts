import { HeroStats } from "./HeroStats";
import { RollDialogBody } from "./RollDialogBody";
import { StatsFields } from "./StatsFields";
import { StatsTab } from "./StatsTab";
import { UnitStatsFields } from "./UnitStatsFields";

import type { SystemUi } from "@/components/systems/types";

export const D20_MODULE_UI: SystemUi = { HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields, hideProgression: false };
