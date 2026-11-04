import type { CharacteristicKey, Characteristics } from "./wfrp/characteristics/keys";

import type { RuleSystemKey } from "@/lib/constants/rules";
import type { Translator } from "@/lib/i18n/translator";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { MechanicKey } from "@/lib/utils/rules/registry";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";
import type { CharacterResources, SheetRollBody, SheetRollResult } from "@/types/characters";

export type { RuleSystemKey };

export interface CharacterHpInput {
  level: number;
  constitution: number;
  archetype?: string | null;
}

export interface SheetBlockInput {
  characteristics: Characteristics;
  resources: CharacterResources;
}

export interface SheetWfrpBlock {
  characteristics: { key: CharacteristicKey; base: number; advances: number; value: number; bonus: number }[];
  wounds: { max: number; breakdown: HpBreakdownLine[] };
  move: { value: number; walkYd: number; runYd: number };
  skills: { key: string; spec?: string; characteristic: CharacteristicKey; target: number; advances: number; trained: boolean; kind: "basic" | "advanced" }[];
  fate: number;
  fortune: number;
}

export interface SheetTestInput {
  participant: BattleParticipant;
  character: { characteristics?: unknown };
  body: SheetRollBody;
  rules: Ruleset;
  rng: Rng;
  inspiration: boolean;
  t: Translator;
  presetRoll?: number;
}

export type SheetTestResult = SheetRollResult;

export interface RuleSystemDefinition {
  key: RuleSystemKey;
  distance: { unit: "ft" | "yd"; perCell: number };
  balance: { kind: "fair" } | { kind: "none" };
  progression: {
    levels: boolean;
    maxHp(input: { character: CharacterHpInput; characteristics: Characteristics; rules: Ruleset }): { total: number; breakdown: HpBreakdownLine[] } | null;
  };
  characteristics: { kind: "d20" | "wfrp"; sheetBlock(input: SheetBlockInput): SheetWfrpBlock | undefined };
  sheetTest: { accepts(body: { kind: string }): boolean; roll(input: SheetTestInput): SheetTestResult };
  rest: { kinds: boolean; onSession?(resources: CharacterResources, characteristics: Characteristics): CharacterResources };
  battle: { supported: boolean };
  lineage: boolean;
  attacks: boolean;
  spells: boolean;
  items: boolean;
  d20Stats: boolean;
  unusedMechanics: readonly MechanicKey[];
}
