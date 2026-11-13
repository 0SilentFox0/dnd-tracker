import { DeathSaveBadge } from './battle/DeathSaveBadge';
import { d20Defense } from './battle/defense';
import { HeroStats as BattleHeroStats } from './battle/HeroStats';
import { ParticipantStats } from './battle/ParticipantStats';
import { SpellSlotsPanel } from './battle/SpellSlotsPanel';
import { ResourceFields } from './rest/ResourceFields';
import { RestBadges } from './rest/RestBadges';
import { ActionsSection } from './rules/ActionsSection';
import { ClassesSection } from './rules/ClassesSection';
import { ConcentrationSection } from './rules/ConcentrationSection';
import { ConditionsSection } from './rules/ConditionsSection';
import { CriticalsSection } from './rules/CriticalsSection';
import { DeathSavesSection } from './rules/DeathSavesSection';
import { FormulasSection } from './rules/FormulasSection';
import { InitiativeSection } from './rules/InitiativeSection';
import { SavesSection } from './rules/SavesSection';
import { HeroStats } from './HeroStats';
import { RollDialogBody } from './RollDialogBody';
import { StatsFields } from './StatsFields';
import { StatsTab } from './StatsTab';
import { UnitStatsFields } from './UnitStatsFields';

import type { SystemUi } from '@/components/systems/types';

export const D20_MODULE_UI: SystemUi = {
    battle: {
        HeroStats: BattleHeroStats,
        defense: d20Defense,
        ParticipantStats,
        heroPanels: [SpellSlotsPanel],
        badges: [DeathSaveBadge],
    },
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
    HeroStats,
    StatsTab,
    RollDialogBody,
    StatsFields,
    UnitStatsFields,
    RestBadges,
    ResourceFields,
    resourceDefaults: (sheet) => ({
        tempHp: String(sheet.rest?.hp?.temp ?? 0),
        exhaustion: String(sheet.rest?.exhaustion ?? 0),
    }),
    hideProgression: false,
};
