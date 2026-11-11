import type { SystemUi } from "../types";
import { HeroStats } from "./HeroStats";
import { RollDialogBody } from "./RollDialogBody";
import { StatsFields } from "./StatsFields";
import { StatsTab } from "./StatsTab";
import { UnitStatsFields } from "./UnitStatsFields";

export const D20_UI: SystemUi = { HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields, hideProgression: false };
