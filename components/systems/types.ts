import type { ComponentType } from "react";

import type { SystemConditionBody } from "@/lib/hooks/battles";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import type { DifficultyKey } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { CareerData } from "@/types/careers";
import type { SheetRollBody, SheetRollResult, SheetTotal } from "@/types/characters";
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
  difficulty: DifficultyKey;
  setDifficulty: (difficulty: DifficultyKey) => void;
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

export interface SystemUi {
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
  battleConditionsDialog?: ComponentType<SystemConditionsDialogProps>;
}
