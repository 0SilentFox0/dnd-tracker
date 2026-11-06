import dynamic from "next/dynamic";

import { type SystemUi } from "../types";
import { CareerForm } from "./careers/CareerForm";
import { WfrpDraftForm } from "./creation/WfrpDraftForm";
import { AdvancementEditor } from "./AdvancementEditor";
import { AdvancementTab } from "./AdvancementTab";
import { HeroStats } from "./HeroStats";
import { MagicTab } from "./MagicTab";
import { RollDialogBody } from "./RollDialogBody";
import { StatsFields } from "./StatsFields";
import { StatsTab } from "./StatsTab";
import { SystemConditionsDialog } from "./SystemConditionsDialog";
import { UnitStatsFields } from "./UnitStatsFields";

const SpeciesProfileEditor = dynamic(() => import("./creation/SpeciesProfileEditor").then((m) => m.SpeciesProfileEditor));

const ArtifactStatsEditor = dynamic(() => import("./equipment/ArtifactStatsEditor").then((m) => m.ArtifactStatsEditor));

const EquippedSummary = dynamic(() => import("./equipment/EquippedArmourSummary").then((m) => m.EquippedArmourSummary));

export const WFRP_UI: SystemUi = { HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields, hideProgression: true, MagicTab, AdvancementTab, AdvancementEditor, CareerForm, DraftForm: WfrpDraftForm, RaceProfileEditor: SpeciesProfileEditor, battleConditionsDialog: SystemConditionsDialog, ArtifactStatsEditor, EquippedSummary };
