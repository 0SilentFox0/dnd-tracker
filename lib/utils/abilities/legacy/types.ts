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

/** ActiveSkill зі snapshot учасника, збереженого до 3a. */
export interface LegacyActiveSkill {
  skillId: string;
  name: string;
  mainSkillId: string;
  level: string;
  icon?: string | null;
  description?: string | null;
  effects: Array<{ stat: string; type: string; value: number | string | boolean; isPercentage: boolean; duration?: number; target?: string }>;
  affectsDamage?: boolean;
  damageType?: "melee" | "ranged" | "magic" | null;
  linkedSpellId?: string | null;
  spellGroupId?: string | null;
  spellEnhancements?: Record<string, unknown>;
  skillTriggers?: unknown[];
}
