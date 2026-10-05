import type { Ability } from "@/lib/utils/abilities/schema";

export interface LegacyEffect {
  stat: string;
  type: string;
  value: number | string | boolean;
  isPercentage: boolean;
  duration?: number;
  target?: string;
  maxTriggers?: number | null;
}

export interface ConversionIssue {
  severity: "loss" | "behavior";
  message: string;
}

export interface ConversionResult {
  abilities: Ability[];
  issues: ConversionIssue[];
}

export interface ConvertOptions {
  skipBakedStats?: boolean;
}
