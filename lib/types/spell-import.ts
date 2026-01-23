import {
  SpellDamageType,
  SpellSavingThrowAbility,
  SpellSavingThrowOnSuccess,
  SpellType,
} from "@/lib/constants/spell-abilities";

export interface CSVSpellRow {
  [key: string]: string | undefined;
  Level?: string;
  level?: string;
  Effect?: string;
  effect?: string;
  School?: string;
  school?: string;
  "UA Name"?: string;
  name?: string;
  Name?: string;
  "Original Name"?: string;
  originalName?: string;
}

export interface ImportSpell {
  name: string;
  level: number;
  school?: string;
  type: SpellType;
  damageType: SpellDamageType;
  damageElement?: string;
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
  concentration: boolean;
  damageDice?: string;
  savingThrowAbility?: SpellSavingThrowAbility;
  savingThrowOnSuccess?: SpellSavingThrowOnSuccess;
  description: string;
  groupId?: string;
}

export interface SpellImportResult {
  imported: number;
  total: number;
}
