import type { CharacteristicKey, Characteristics } from "./wfrp/characteristics/schema";

import type { RuleSystemKey } from "@/lib/constants/rules";
import type { Translator } from "@/lib/i18n/translator";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { MechanicKey } from "@/lib/utils/rules/registry";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";
import type { CharacterResources, SheetRollResult } from "@/types/characters";

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
  body: { kind: string };
  rules: Ruleset;
  rng: () => number;
  inspiration: boolean;
  t: Translator;
}

export type SheetTestResult = SheetRollResult & { kind: "d20" };

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
  rest: { onSession?(resources: CharacterResources, characteristics: Characteristics): CharacterResources };
  battle: { supported: boolean };
  unusedMechanics: readonly MechanicKey[];
}
