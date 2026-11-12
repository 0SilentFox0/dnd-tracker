import { ActionsSection } from "./rules/ActionsSection";
import { ClassesSection } from "./rules/ClassesSection";
import { ConcentrationSection } from "./rules/ConcentrationSection";
import { ConditionsSection } from "./rules/ConditionsSection";
import { CriticalsSection } from "./rules/CriticalsSection";
import { DeathSavesSection } from "./rules/DeathSavesSection";
import { FormulasSection } from "./rules/FormulasSection";
import { InitiativeSection } from "./rules/InitiativeSection";
import { SavesSection } from "./rules/SavesSection";
import { HeroStats } from "./HeroStats";
import { RollDialogBody } from "./RollDialogBody";
import { StatsFields } from "./StatsFields";
import { StatsTab } from "./StatsTab";
import { UnitStatsFields } from "./UnitStatsFields";

import type { SystemUi } from "@/components/systems/types";

export const D20_MODULE_UI: SystemUi = {
  rulesSections: {
    criticals: CriticalsSection,
    formulas: FormulasSection,
    initiative: InitiativeSection,
    saves: SavesSection,
    deathSaves: DeathSavesSection,
    concentration: ConcentrationSection,
    conditions: ConditionsSection,
    actions: ActionsSection,
    classes: ClassesSection,
  },
  HeroStats, StatsTab, RollDialogBody, StatsFields, UnitStatsFields,
  hideProgression: false,
};
