import { type SystemUi } from "../types";
import { AdvancementTab } from "./AdvancementTab";
import { HeroStats } from "./HeroStats";
import { MagicTab } from "./MagicTab";
import { RollDialogBody } from "./RollDialogBody";
import { StatsFields } from "./StatsFields";
import { StatsTab } from "./StatsTab";
import { SystemConditionsDialog } from "./SystemConditionsDialog";
import { UnitStatsFields } from "./UnitStatsFields";

export const WFRP_UI: SystemUi = { HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields, hideProgression: true, MagicTab, AdvancementTab, battleConditionsDialog: SystemConditionsDialog };
