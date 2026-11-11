import dynamic from "next/dynamic";

import { ActionResult } from "./battle/ActionResult";
import { CastTestBody } from "./battle/CastTestBody";
import { ChannelLabel } from "./battle/ChannelLabel";
import { D100RollBody } from "./battle/D100RollBody";
import { D100RollTitle } from "./battle/D100RollTitle";
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

import { type SystemBattleUi, type SystemUi } from "@/components/systems/types";
import { SHEET_SLOT } from "@/systems/wfrp/rules/slots";

const SpeciesProfileEditor = dynamic(() => import("./creation/SpeciesProfileEditor").then((m) => m.SpeciesProfileEditor));

const ArtifactStatsEditor = dynamic(() => import("./equipment/ArtifactStatsEditor").then((m) => m.ArtifactStatsEditor));

const EquippedSummary = dynamic(() => import("./equipment/EquippedArmourSummary").then((m) => m.EquippedArmourSummary));

const DowntimeTab = dynamic(() => import("./downtime/DowntimeTab").then((m) => m.DowntimeTab));

const DowntimePeriodPanel = dynamic(() => import("./downtime/DowntimePeriodPanel").then((m) => m.DowntimePeriodPanel));

// rules sections pull zod via the tables schema; the player profile graph must stay zod-free
const AdvancementSection = dynamic(() => import("@/systems/wfrp/ui/rules/AdvancementSection").then((m) => m.AdvancementSection));

const TablesSection = dynamic(() => import("@/systems/wfrp/ui/rules/TablesSection").then((m) => m.TablesSection));

const ConditionTestPanel = dynamic(() => import("./battle/ConditionTestPanel").then((m) => m.ConditionTestPanel));

const ChannelDialog = dynamic(() => import("./battle/ChannelDialog").then((m) => m.ChannelDialog));

const SpellMagicFields = dynamic(() => import("./spells/SpellMagicFields").then((m) => m.SpellMagicFields));

const battle: SystemBattleUi = { RollBody: D100RollBody, RollTitle: D100RollTitle, CastTest: CastTestBody, ChannelDialog, ChannelLabel, ConditionTestPanel };

export const WFRP_UI: SystemUi = { battle, SpellMagicFields, rulesSections: { advancement: AdvancementSection, tables: TablesSection }, HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields, hideProgression: true, MagicTab, AdvancementTab, AdvancementEditor, CareerForm, DraftForm: WfrpDraftForm, RaceProfileEditor: SpeciesProfileEditor, battleConditionsDialog: SystemConditionsDialog, ArtifactStatsEditor, EquippedSummary, DowntimeTab, DowntimePeriodPanel, RestBadges, ResourceFields, ActionResult, resourceDefaults: (sheet) => ({ sin: String(SHEET_SLOT.read(sheet.systemSlot)?.sin ?? 0) }) };
