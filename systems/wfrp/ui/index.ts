import dynamic from 'next/dynamic';

import { ActionResult } from './battle/ActionResult';
import { CastTestBody } from './battle/CastTestBody';
import { ChannelLabel } from './battle/ChannelLabel';
import { D100RollBody } from './battle/D100RollBody';
import { D100RollTitle } from './battle/D100RollTitle';
import { WfrpDraftForm } from './creation/WfrpDraftForm';
import { CareersPage } from './dm/CareersPage';
import { AdvancementEditor } from './AdvancementEditor';
import { AdvancementTab } from './AdvancementTab';
import { HeroStats } from './HeroStats';
import { WFRP_UI_ICONS } from './icons';
import { MagicTab } from './MagicTab';
import { ResourceFields } from './ResourceFields';
import { RestBadges } from './RestBadges';
import { RollDialogBody } from './RollDialogBody';
import { StatsFields } from './StatsFields';
import { StatsTab } from './StatsTab';
import { SystemConditionsDialog } from './SystemConditionsDialog';
import { UnitStatsFields } from './UnitStatsFields';

import { type SystemBattleUi, type SystemUi } from '@/components/systems/types';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';

const SpeciesProfileEditor = dynamic(() =>
    import('./creation/SpeciesProfileEditor').then(
        (m) => m.SpeciesProfileEditor
    )
);

const ArtifactStatsEditor = dynamic(() =>
    import('./equipment/ArtifactStatsEditor').then((m) => m.ArtifactStatsEditor)
);

const EquippedSummary = dynamic(() =>
    import('./equipment/EquippedArmourSummary').then(
        (m) => m.EquippedArmourSummary
    )
);

const DowntimeTab = dynamic(() =>
    import('./downtime/DowntimeTab').then((m) => m.DowntimeTab)
);

const DowntimePeriodPanel = dynamic(() =>
    import('./downtime/DowntimePeriodPanel').then((m) => m.DowntimePeriodPanel)
);

// rules sections pull zod via the tables schema; the player profile graph must stay zod-free
const AdvancementSection = dynamic(() =>
    import('@/systems/wfrp/ui/rules/AdvancementSection').then(
        (m) => m.AdvancementSection
    )
);

const EditionSection = dynamic(() =>
    import('@/systems/wfrp/ui/rules/EditionSection').then(
        (m) => m.EditionSection
    )
);

const TablesSection = dynamic(() =>
    import('@/systems/wfrp/ui/rules/TablesSection').then((m) => m.TablesSection)
);

const ConditionTestPanel = dynamic(() =>
    import('./battle/ConditionTestPanel').then((m) => m.ConditionTestPanel)
);

const ChannelDialog = dynamic(() =>
    import('./battle/ChannelDialog').then((m) => m.ChannelDialog)
);

const FateReactionDialog = dynamic(() =>
    import('./battle/FateReactionDialog').then((m) => m.FateReactionDialog)
);

const FateWaitingNotice = dynamic(() =>
    import('./battle/FateWaitingNotice').then((m) => m.FateWaitingNotice)
);

const DispelPanel = dynamic(() =>
    import('./battle/DispelPanel').then((m) => m.DispelPanel)
);

const PsychologyPanel = dynamic(() =>
    import('./battle/PsychologyPanel').then((m) => m.PsychologyPanel)
);

const MomentumPanel = dynamic(() =>
    import('./battle/MomentumPanel').then((m) => m.MomentumPanel)
);

const SpellMagicFields = dynamic(() =>
    import('./spells/SpellMagicFields').then((m) => m.SpellMagicFields)
);

const battle: SystemBattleUi = {
    RollBody: D100RollBody,
    RollTitle: D100RollTitle,
    CastTest: CastTestBody,
    ChannelDialog,
    ChannelLabel,
    ConditionTestPanel,
    ConditionsDialog: SystemConditionsDialog,
    heroPanels: [MomentumPanel, PsychologyPanel, DispelPanel],
    dialogs: [FateReactionDialog],
    notices: [FateWaitingNotice],
};

export const WFRP_UI_ICON_MAP = Object.assign(
    {},
    ...Object.values(WFRP_UI_ICONS)
) as NonNullable<SystemUi['uiIcons']>;

export const WFRP_MODULE_UI: SystemUi = {
    battle,
    uiIcons: WFRP_UI_ICON_MAP,
    SpellMagicFields,
    rulesSections: {
        advancement: AdvancementSection,
        tables: TablesSection,
        edition: EditionSection,
    },
    HeroStats,
    StatsTab,
    RollDialogBody,
    StatsFields,
    UnitStatsFields,
    hideProgression: true,
    MagicTab,
    AdvancementTab,
    AdvancementEditor,
    dmPages: { careers: CareersPage },
    DraftForm: WfrpDraftForm,
    RaceProfileEditor: SpeciesProfileEditor,
    ArtifactStatsEditor,
    EquippedSummary,
    DowntimeTab,
    DowntimePeriodPanel,
    RestBadges,
    ResourceFields,
    ActionResult,
    resourceDefaults: (sheet) => {
        const block = SHEET_SLOT.read(sheet.systemSlot);

        return {
            fortune: String(block?.fortune ?? 0),
            fate: String(block?.fateLeft ?? 0),
            sin: String(block?.sin ?? 0),
        };
    },
};
