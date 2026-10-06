import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";

export type { ConversionIssue };

export interface LegacyEffect {
  stat: string;
  type: string;
  value: number | string | boolean;
  isPercentage: boolean;
  duration?: number;
  target?: string;
  maxTriggers?: number | null;
}

export interface ConversionResult {
  abilities: Ability[];
  issues: ConversionIssue[];
}

export interface ConvertOptions {
  skipBakedStats?: boolean;
}
