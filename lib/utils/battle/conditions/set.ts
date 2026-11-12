import type { AbilityKey } from "@/lib/constants/abilities";
import type { RulesEdition } from "@/lib/constants/rules";
import type { Condition5eKey, CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { Ruleset } from "@/lib/utils/rules";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export { CONDITION_5E_KEYS, type Condition5eKey } from "@/lib/utils/abilities/schema/kinds";

export const PERMANENT_ROUNDS = 99;

export type ConditionKey = Condition5eKey | CustomConditionKey;

export type ExhaustionVariant = RulesEdition;

export interface ApplyConditionOptions {
  key: ConditionKey;
  rounds: number;
  permanent?: boolean;
  levels?: number;
  saveEnds?: { ability: AbilityKey; dc: number };
  source: ActiveEffect["source"];
  sourceName: LogLine;
  timedKey: string;
  round: number;
  rules: Ruleset;
}

export interface ApplyConditionResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  blocked: boolean;
}

export interface ConditionEffectOptions {
  timedKey: string;
  rounds: number;
  exhaustion: ExhaustionVariant;
  permanent?: boolean;
  levels?: number;
  saveEnds?: ActiveEffect["saveEnds"];
  source?: ActiveEffect["source"];
}

