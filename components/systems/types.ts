import type { ComponentType } from "react";

import type { SpellFormFieldsProps } from "@/components/spells/form/SpellFormBasicFields";
import type { useAttackWizard, useChannelAction, useSpellBook } from "@/lib/hooks/battle";
import type { SystemConditionBody } from "@/lib/hooks/battles";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import type { MechanicKey } from "@/lib/utils/rules/registry";
import type { SystemConditionInfo } from "@/lib/utils/rules/systems";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import type { BattleParticipant } from "@/types/battle";
import type { CareerData } from "@/types/careers";
import type { CharacterListItem, CharacterSheet, SheetRollBody, SheetRollResult, SheetTotal } from "@/types/characters";
import type { Unit } from "@/types/units";

export interface SheetRollRequest {
  label: string;
  subject: SheetRollBody;
}

export interface StatsTabProps {
  section: "top" | "bottom";
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
  mode: "create" | "edit";
  classArmor?: SheetTotal | null;
}

export interface AdvancementEditorProps {
  bindings: CharacterFormBindings;
  campaignId: string;
}

export interface CareerFormProps {
  formId: string;
  campaignId: string;
  career?: CareerData;
  onDone: () => void;
  onSavingChange?: (saving: boolean) => void;
}

export interface UnitStatsFieldsProps {
  formData: Partial<Unit>;
  onChange: (patch: Partial<Unit>) => void;
  fiveE?: boolean;
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
  channel: ReturnType<typeof useChannelAction>;
}

export interface ConditionTestPanelProps {
  hero: BattleParticipant;
}

export interface SpellMagicFieldsProps extends SpellFormFieldsProps {
  conditions: readonly SystemConditionInfo[];
}

export interface SystemBattleUi {
  RollBody?: ComponentType<RollBodyProps>;
  RollTitle?: ComponentType;
  CastTest?: ComponentType<CastTestProps>;
  ChannelDialog?: ComponentType<ChannelDialogProps>;
  ChannelLabel?: ComponentType;
  ConditionTestPanel?: ComponentType<ConditionTestPanelProps>;
}

export interface SystemUi {
  battle?: SystemBattleUi;
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
  CareerForm?: ComponentType<CareerFormProps>;
  DraftForm?: ComponentType<DraftFormProps>;
  RaceProfileEditor?: ComponentType<RaceProfileEditorProps>;
  battleConditionsDialog?: ComponentType<SystemConditionsDialogProps>;
  ArtifactStatsEditor?: ComponentType<ArtifactStatsEditorProps>;
  EquippedSummary?: ComponentType<EquippedSummaryProps>;
  DowntimeTab?: ComponentType;
  DowntimePeriodPanel?: ComponentType<DowntimePeriodPanelProps>;
  RestBadges?: ComponentType<RestBadgesProps>;
  ResourceFields?: ComponentType<ResourceFieldsProps>;
  resourceDefaults?(sheet: CharacterSheet): Record<string, string>;
  ActionResult?: ComponentType<ActionResultProps>;
  rulesSections?: Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>>;
  /** Editors of items a module adds to another module's section, keyed `section.item` */
  rulesItems?: Record<string, ComponentType<RulesSectionProps>>;
}
