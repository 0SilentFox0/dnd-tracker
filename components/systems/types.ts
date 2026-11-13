import type { ComponentType, ReactNode } from 'react';

import type { SpellFormFieldsProps } from '@/components/spells/form/SpellFormBasicFields';
import type { useAttackWizard, useSpellBook } from '@/lib/hooks/battle';
import type { TurnGateControls } from '@/lib/hooks/battle/types';
import type { SystemConditionBody } from '@/lib/hooks/battles';
import type { RulesFormState } from '@/lib/hooks/campaigns';
import type { TurnGateOutcome } from '@/lib/utils/battle/flows';
import type { BattleKnowledge } from '@/lib/utils/battle/view/knowledge';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';
import type { MechanicKey } from '@/lib/utils/rules/registry';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { SystemConditionInfo } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleAction, BattleParticipant } from '@/types/battle';
import type {
    CharacterListItem,
    CharacterSheet,
    SheetRollBody,
    SheetRollResult,
    SheetTotal,
} from '@/types/characters';
import type { Unit } from '@/types/units';

export interface SheetRollRequest {
    label: string;
    subject: SheetRollBody;
}

export interface StatsTabProps {
    section: 'top' | 'bottom';
    onRoll: (request: SheetRollRequest) => void;
    canRoll: boolean;
}

export interface RollDialogBodyProps {
    request: SheetRollRequest;
    result: SheetRollResult | null;
    difficulty: string;
    setDifficulty: (difficulty: string) => void;
}

export interface StatsFieldsProps {
    bindings: CharacterFormBindings;
    campaignId: string;
    mode: 'create' | 'edit';
    classArmor?: SheetTotal | null;
    /** Rendered after the combat fields (module-provided `forms.fields`); built by the caller to keep the registry out of this subtree */
    extraFields?: ReactNode;
}

export interface AdvancementEditorProps {
    bindings: CharacterFormBindings;
    campaignId: string;
}

export interface UnitStatsFieldsProps {
    formData: Partial<Unit>;
    onChange: (patch: Partial<Unit>) => void;
    monsterStats?: boolean;
}

export interface SystemConditionsDialogProps {
    participant: BattleParticipant | null;
    onClose: () => void;
    onSubmit: (body: SystemConditionBody) => void;
    isPending: boolean;
}

export interface DraftFormProps {
    campaignId: string;
    characterId?: string;
    initialIdentity?: unknown;
}

export interface RestBadgesProps {
    sheet: CharacterSheet;
}

export interface ResourceFieldsProps {
    sheet: CharacterSheet;
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
}

export interface FormFieldProps {
    combatStats: CharacterFormBindings['combatStats'];
    rules: Ruleset;
}

export interface CombatRowProps {
    sheet: CharacterSheet;
    rules: Ruleset;
}

export interface PathPanelProps {
    manage: boolean;
}

export interface ItemSectionProps {
    sheet: CharacterSheet;
    variant: 'editor' | 'inventory';
}

export interface RaceProfileEditorProps {
    campaignId: string;
    raceId: string;
}

export interface ArtifactStatsEditorProps {
    value: unknown;
    onChange: (value: unknown) => void;
    slot: string;
    onValidityChange?: (valid: boolean) => void;
}

export interface EquippedSummaryProps {
    campaignId: string;
    characterId: string;
}

export interface DowntimePeriodPanelProps {
    campaignId: string;
    characters: CharacterListItem[];
}

export interface ActionResultProps {
    details: SystemSlot;
    hit: boolean;
    /** The viewer may see the target's exact defense */
    exact: boolean;
}

export interface RulesSectionProps {
    form: RulesFormState;
}

export interface RollBodyProps {
    wizard: ReturnType<typeof useAttackWizard>;
}

export interface CastTestProps {
    book: ReturnType<typeof useSpellBook>;
}

export interface ChannelDialogProps {
    hero: BattleParticipant;
    open: boolean;
    onClose(): void;
    onDone?(): void;
}

export interface ConditionTestPanelProps {
    hero: BattleParticipant;
}

export interface SpellMagicFieldsProps extends SpellFormFieldsProps {
    conditions: readonly SystemConditionInfo[];
}

export interface DefenseCtx {
    order: BattleParticipant[];
    log: BattleAction[];
    knowledge?: BattleKnowledge;
    exact: boolean;
}

export interface HeroStatsProps {
    hero: BattleParticipant;
    compact: boolean;
}

export interface ParticipantStatsProps {
    participant: BattleParticipant;
    exact: boolean;
}

export interface HeroPanelProps {
    hero: BattleParticipant;
}

export interface BattleBadgeProps {
    participant: BattleParticipant;
    place: 'hero' | 'row';
}

export type { TurnGateControls };

export interface TurnStartPanelProps {
    hero: BattleParticipant;
    gate: TurnGateControls;
}

/** Every slot is optional: a missing slot is a missing mechanic */
export interface SystemBattleUi {
    HeroStats?: ComponentType<HeroStatsProps>;
    defense?(participant: BattleParticipant, ctx: DefenseCtx): string | null;
    ParticipantStats?: ComponentType<ParticipantStatsProps>;
    ConditionsDialog?: ComponentType<SystemConditionsDialogProps>;
    /** Lists concatenate across modules in composition order */
    heroPanels?: readonly ComponentType<HeroPanelProps>[];
    badges?: readonly ComponentType<BattleBadgeProps>[];
    dialogs?: readonly ComponentType[];
    notices?: readonly ComponentType[];
    /** One module claims it: the check a participant resolves before the first action */
    turnStart?: {
        Panel: ComponentType<TurnStartPanelProps>;
        Label: ComponentType<{ outcome?: TurnGateOutcome }>;
    };
    RollBody?: ComponentType<RollBodyProps>;
    RollTitle?: ComponentType;
    CastTest?: ComponentType<CastTestProps>;
    ChannelDialog?: ComponentType<ChannelDialogProps>;
    ChannelLabel?: ComponentType;
    ConditionTestPanel?: ComponentType<ConditionTestPanelProps>;
}

export interface SystemUi {
    battle: SystemBattleUi;
    SpellMagicFields?: ComponentType<SpellMagicFieldsProps>;
    HeroStats: ComponentType;
    StatsTab: ComponentType<StatsTabProps>;
    RollDialogBody: ComponentType<RollDialogBodyProps>;
    StatsFields: ComponentType<StatsFieldsProps>;
    UnitStatsFields: ComponentType<UnitStatsFieldsProps>;
    hideProgression: boolean;
    MagicTab?: ComponentType;
    AdvancementTab?: ComponentType;
    AdvancementEditor?: ComponentType<AdvancementEditorProps>;
    dmPages?: Record<
        string,
        ComponentType<{ campaignId: string; canEdit: boolean }>
    >;
    DraftForm?: ComponentType<DraftFormProps>;
    RaceProfileEditor?: ComponentType<RaceProfileEditorProps>;
    ArtifactStatsEditor?: ComponentType<ArtifactStatsEditorProps>;
    EquippedSummary?: ComponentType<EquippedSummaryProps>;
    DowntimeTab?: ComponentType;
    DowntimePeriodPanel?: ComponentType<DowntimePeriodPanelProps>;
    RestBadges?: ComponentType<RestBadgesProps>;
    ResourceFields?: ComponentType<ResourceFieldsProps>;
    resourceDefaults?(sheet: CharacterSheet): Record<string, string>;
    /** Extra fields of the character form's combat block; lists concatenate across modules */
    forms?: { fields?: readonly ComponentType<FormFieldProps>[] };
    /** Extra rows of the sheet's defense section */
    sheet?: {
        combatRows?: readonly ComponentType<CombatRowProps>[];
        /** Panels of the «Path» tab a module adds; data comes from `useProfile()` */
        pathPanels?: readonly ComponentType<PathPanelProps>[];
        /** Extra sections of the editor and the inventory tab */
        itemSections?: readonly ComponentType<ItemSectionProps>[];
    };
    ActionResult?: ComponentType<ActionResultProps>;
    rulesSections?: Partial<
        Record<MechanicKey, ComponentType<RulesSectionProps>>
    >;
    /** Editors of items a module adds to another module's section, keyed `section.item` */
    rulesItems?: Record<string, ComponentType<RulesSectionProps>>;
}
