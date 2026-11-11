import dynamic from "next/dynamic";

import { ActionResult } from "./battle/ActionResult";
import { CareerForm } from "./careers/CareerForm";
import { WfrpDraftForm } from "./creation/WfrpDraftForm";
import { AdvancementEditor } from "./AdvancementEditor";
import { AdvancementTab } from "./AdvancementTab";
import { HeroStats } from "./HeroStats";
import { MagicTab } from "./MagicTab";
import { ResourceFields } from "./ResourceFields";
import { RestBadges } from "./RestBadges";
import { RollDialogBody } from "./RollDialogBody";
import { StatsFields } from "./StatsFields";
import { StatsTab } from "./StatsTab";
import { SystemConditionsDialog } from "./SystemConditionsDialog";
import { UnitStatsFields } from "./UnitStatsFields";

import { type SystemUi } from "@/components/systems/types";
import { SHEET_SLOT } from "@/systems/wfrp/rules/slots";

const SpeciesProfileEditor = dynamic(() => import("./creation/SpeciesProfileEditor").then((m) => m.SpeciesProfileEditor));

const ArtifactStatsEditor = dynamic(() => import("./equipment/ArtifactStatsEditor").then((m) => m.ArtifactStatsEditor));

const EquippedSummary = dynamic(() => import("./equipment/EquippedArmourSummary").then((m) => m.EquippedArmourSummary));

const DowntimeTab = dynamic(() => import("./downtime/DowntimeTab").then((m) => m.DowntimeTab));

const DowntimePeriodPanel = dynamic(() => import("./downtime/DowntimePeriodPanel").then((m) => m.DowntimePeriodPanel));

export const WFRP_UI: SystemUi = { HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields, hideProgression: true, MagicTab, AdvancementTab, AdvancementEditor, CareerForm, DraftForm: WfrpDraftForm, RaceProfileEditor: SpeciesProfileEditor, battleConditionsDialog: SystemConditionsDialog, ArtifactStatsEditor, EquippedSummary, DowntimeTab, DowntimePeriodPanel, RestBadges, ResourceFields, ActionResult, resourceDefaults: (sheet) => ({ sin: String(SHEET_SLOT.read(sheet.systemSlot)?.sin ?? 0) }) };
